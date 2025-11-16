/************** 0. 默认配置 + 配置持久化 **************/
const DEFAULT_FOCUSES = [
  { id: "f_main_1", branch: "主线",   title: "今天主线起步", defaultMinutes: 25, dependsOn: [],            row: 1, col: 3, desc: "" },
  { id: "f_main_2", branch: "主线",   title: "主线推进",     defaultMinutes: 50, dependsOn: ["f_main_1"],  row: 2, col: 3, desc: "" },
  { id: "f_main_3", branch: "主线",   title: "主线收尾",     defaultMinutes: 25, dependsOn: ["f_main_2"],  row: 3, col: 3, desc: "" },
  { id: "f_write_1", branch: "写作线", title: "笔记与摘录",   defaultMinutes: 25, dependsOn: [],            row: 1, col: 1, desc: "" },
  { id: "f_write_2", branch: "写作线", title: "段落起草",     defaultMinutes: 25, dependsOn: ["f_write_1"], row: 2, col: 1, desc: "" },
  { id: "f_write_3", branch: "写作线", title: "修改与打磨",   defaultMinutes: 25, dependsOn: ["f_write_2"], row: 3, col: 1, desc: "" },
  { id: "f_health_1", branch: "健康线", title: "拉伸与活动",   defaultMinutes: 10, dependsOn: [],            row: 1, col: 5, desc: "" },
  { id: "f_health_2", branch: "健康线", title: "专注运动块",   defaultMinutes: 30, dependsOn: ["f_health_1"],row: 2, col: 5, desc: "" },
  { id: "f_life_1", branch: "生活线",  title: "环境整理",     defaultMinutes: 15, dependsOn: [],            row: 2, col: 2, desc: "" },
  { id: "f_life_2", branch: "生活线",  title: "补给与采购",   defaultMinutes: 20, dependsOn: ["f_life_1"],  row: 3, col: 2, desc: "" }
];

const CONFIG_KEY  = "focus_tree_custom_config_v1";
const STORAGE_KEY = "focus_tree_state_v1";
const THEME_KEY   = "focus_tree_theme_v1";

let focuses = [];

/** 加载 / 保存配置（国策结构） */
function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) {
      focuses = DEFAULT_FOCUSES.map(f => ({ ...f }));
      return;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      focuses = DEFAULT_FOCUSES.map(f => ({ ...f }));
      return;
    }
    focuses = parsed.map(f => ({
      ...f,
      dependsOn: Array.isArray(f.dependsOn) ? f.dependsOn : [],
      defaultMinutes: Number(f.defaultMinutes) || 25,
      row: Number(f.row) || 1,
      col: Number(f.col) || 1,
      desc: f.desc || ""
    }));
  } catch (e) {
    console.warn("加载自定义配置失败，使用默认：", e);
    focuses = DEFAULT_FOCUSES.map(f => ({ ...f }));
  }
}

function saveConfig() {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(focuses));
  } catch (e) {
    console.warn("保存自定义配置失败：", e);
  }
}

/************** 0.1 主题颜色持久化 **************/
const defaultTheme = {
  bg:   "#3b3b3b",
  gold: "#d4af37",
  blue: "#4ea4ff"
};
let theme = { ...defaultTheme };

function applyTheme() {
  const root = document.documentElement;
  root.style.setProperty("--color-bg-top", theme.bg);
  root.style.setProperty("--color-bg-mid", theme.bg);
  root.style.setProperty("--color-accent-gold", theme.gold);
  root.style.setProperty("--color-accent-blue", theme.blue);
}

function loadTheme() {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (!raw) {
      theme = { ...defaultTheme };
      applyTheme();
      return;
    }
    const parsed = JSON.parse(raw);
    theme = {
      bg:   parsed.bg   || defaultTheme.bg,
      gold: parsed.gold || defaultTheme.gold,
      blue: parsed.blue || defaultTheme.blue
    };
  } catch (e) {
    theme = { ...defaultTheme };
  }
  applyTheme();
}

function saveTheme() {
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify(theme));
  } catch (e) {
    console.warn("保存主题失败：", e);
  }
}

/************** 1. 状态持久化（完成情况 + 图标 + sessions） **************/
let state = {
  completed: [],
  sessions: {},
  icons: {}
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed) return;
    if (Array.isArray(parsed.completed)) state.completed = parsed.completed;
    if (parsed.sessions && typeof parsed.sessions === "object") state.sessions = parsed.sessions;
    if (parsed.icons && typeof parsed.icons === "object") state.icons = parsed.icons;
  } catch (e) {
    console.warn("加载本地状态失败：", e);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("保存本地状态失败：", e);
  }
}

/************** 1.1 顶部全局统计 **************/
const totalPomodorosEl        = document.getElementById("total-pomodoros");
const totalCompletedFocusesEl = document.getElementById("total-completed-focuses");

function updateGlobalStats() {
  let pomodoros = 0;
  for (const key in state.sessions) {
    if (!Object.prototype.hasOwnProperty.call(state.sessions, key)) continue;
    const arr = state.sessions[key];
    if (Array.isArray(arr)) pomodoros += arr.length;
  }
  totalPomodorosEl.textContent        = pomodoros;
  totalCompletedFocusesEl.textContent = state.completed.length;
}

/************** 2. 渲染国策树 **************/
const treeContainer = document.getElementById("tree-container");
let selectedFocusId = null;

function checkUnlocked(focus) {
  if (!focus.dependsOn || focus.dependsOn.length === 0) return true;
  return focus.dependsOn.every(id => state.completed.includes(id));
}

function renderTree() {
  treeContainer.innerHTML = "";
  focuses.forEach(focus => {
    const node = document.createElement("div");
    node.className = "focus-node";
    if (!focus.dependsOn || focus.dependsOn.length === 0) node.classList.add("root");
    node.dataset.id = focus.id;
    node.style.gridRowStart = focus.row;
    node.style.gridColumnStart = focus.col;

    const isCompleted = state.completed.includes(focus.id);
    const isUnlocked  = checkUnlocked(focus);

    if (!isUnlocked && !isCompleted) node.classList.add("locked");
    if (isCompleted) node.classList.add("completed");
    if (currentTimer && currentTimer.focusId === focus.id && !currentTimer.isPaused && currentTimer.remainingMs > 0) {
      node.classList.add("in-progress");
    }
    if (selectedFocusId === focus.id) node.classList.add("selected");

    const iconDiv = document.createElement("div");
    iconDiv.className = "focus-icon";
    const iconConfig = state.icons[focus.id];

    if (iconConfig && iconConfig.kind === "image" && iconConfig.dataUrl) {
      const img = document.createElement("img");
      img.src = iconConfig.dataUrl;
      img.alt = focus.title;
      iconDiv.appendChild(img);
      iconDiv.classList.add("has-image");
    }

    const titleDiv = document.createElement("div");
    titleDiv.className = "focus-title";
    titleDiv.textContent = focus.title;

    const branchDiv = document.createElement("div");
    branchDiv.className = "focus-branch";
    branchDiv.textContent = focus.branch || "未分配支线";

    node.appendChild(iconDiv);
    node.appendChild(titleDiv);
    node.appendChild(branchDiv);

    node.addEventListener("click", () => onNodeClick(focus));

    treeContainer.appendChild(node);
  });
}

/************** 3. 信息栏 DOM **************/
const infoPanel    = document.getElementById("info-panel");
const infoEmptyEl  = document.getElementById("info-empty");
const infoContentEl= document.getElementById("info-content");
const infoTitleEl  = document.getElementById("info-title");
const infoBranchEl = document.getElementById("info-branch");
const infoStatusEl = document.getElementById("info-status");
const infoDefaultEl= document.getElementById("info-default");
const infoCountEl  = document.getElementById("info-count");
const infoTotalEl  = document.getElementById("info-total");
const infoDescEl   = document.getElementById("info-desc");

const btnStartFocus  = document.getElementById("btn-start-focus");
const btnUploadIcon  = document.getElementById("btn-upload-icon");
const btnClearIcon   = document.getElementById("btn-clear-icon");
const iconFileInput  = document.getElementById("icon-file-input");

function setSelectedFocus(focusId) {
  selectedFocusId = focusId;
  document.querySelectorAll(".focus-node.selected").forEach(el => el.classList.remove("selected"));
  const nodeEl = document.querySelector(`.focus-node[data-id="${focusId}"]`);
  if (nodeEl) nodeEl.classList.add("selected");
  updateInfoPanel();
}

function updateInfoPanel() {
  if (!selectedFocusId) {
    infoEmptyEl.style.display   = "block";
    infoContentEl.style.display = "none";
    infoPanel.classList.remove("visible");
    return;
  }
  const focus = focuses.find(f => f.id === selectedFocusId);
  if (!focus) return;

  const isCompleted = state.completed.includes(focus.id);
  const isUnlocked  = checkUnlocked(focus);
  const isCurrent   = currentTimer && currentTimer.focusId === focus.id && currentTimer.remainingMs > 0;
  const isPaused    = isCurrent && currentTimer.isPaused;

  let status;
  if (isCompleted) status = "已完成";
  else if (!isUnlocked) status = "未解锁";
  else if (isCurrent && !isPaused) status = "计时中";
  else if (isCurrent && isPaused) status = "已暂停";
  else status = "可执行";

  const sessions = state.sessions[focus.id] || [];
  const totalMs  = sessions.reduce((s, it) => s + (it.durationMs || 0), 0);
  const totalMin = Math.round(totalMs / 60000);

  infoTitleEl.textContent   = focus.title;
  infoBranchEl.textContent  = focus.branch || "未分配支线";
  infoStatusEl.textContent  = status;
  infoDefaultEl.textContent = focus.defaultMinutes ? `${focus.defaultMinutes} 分钟` : "未设定（默认 25 分钟）";
  infoCountEl.textContent   = sessions.length;
  infoTotalEl.textContent   = totalMin > 0 ? `${totalMin} 分钟` : "0 分钟";
  infoDescEl.textContent    = focus.desc || "";

  infoEmptyEl.style.display   = "none";
  infoContentEl.style.display = "block";
  infoPanel.classList.add("visible");

  btnStartFocus.disabled = !isUnlocked || isCompleted;
}

btnUploadIcon.addEventListener("click", () => {
  if (!selectedFocusId) return;
  iconFileInput.value = "";
  iconFileInput.click();
});

iconFileInput.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file || !selectedFocusId) return;
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    if (!state.icons[selectedFocusId]) state.icons[selectedFocusId] = {};
    state.icons[selectedFocusId].kind = "image";
    state.icons[selectedFocusId].dataUrl = dataUrl;
    saveState();
    renderTree();
    updateInfoPanel();
  };
  reader.readAsDataURL(file);
});

btnClearIcon.addEventListener("click", () => {
  if (!selectedFocusId) return;
  delete state.icons[selectedFocusId];
  saveState();
  renderTree();
  updateInfoPanel();
});

function onNodeClick(focus) {
  setSelectedFocus(focus.id);
}

/************** 4. 番茄钟 + 进度条 **************/
const currentFocusNameEl = document.getElementById("current-focus-name");
const countdownTextEl    = document.getElementById("countdown-text");
const btnPause           = document.getElementById("btn-pause");
const btnResume          = document.getElementById("btn-resume");
const btnCancel          = document.getElementById("btn-cancel");
const btnResetView       = document.getElementById("btn-reset-view");

const progressContainer  = document.getElementById("time-progress-container");
const progressBar        = document.getElementById("time-progress-bar");
const progressLabel      = document.getElementById("time-progress-label");

let currentTimer = null; // { focusId,totalMs,remainingMs,isPaused,intervalId }

function enableTimerButtons(pauseEnabled, resumeEnabled, cancelEnabled) {
  btnPause.disabled  = !pauseEnabled;
  btnResume.disabled = !resumeEnabled;
  btnCancel.disabled = !cancelEnabled;
}

function updateCountdownText(ms, paused) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(sec / 60)).padStart(2,"0");
  const s = String(sec % 60).padStart(2,"0");
  countdownTextEl.textContent = paused ? `暂停 ${m}:${s}` : `${m}:${s}`;
}

function updateProgressBar() {
  if (!currentTimer || !currentTimer.totalMs) {
    progressContainer.style.opacity = 0;
    progressBar.style.width = "0%";
    progressLabel.textContent = "0%";
    return;
  }
  const elapsed = currentTimer.totalMs - currentTimer.remainingMs;
  let ratio = elapsed / currentTimer.totalMs;
  if (ratio < 0) ratio = 0;
  if (ratio > 1) ratio = 1;
  const percent = Math.round(ratio * 100);
  progressBar.style.width = percent + "%";
  progressLabel.textContent = `本次进度 ${percent}%`;
  progressContainer.style.opacity = 1;
}

function resetProgressBar() {
  progressContainer.style.opacity = 0;
  progressBar.style.width = "0%";
  progressLabel.textContent = "0%";
}

function stopCurrentTimer(resetText) {
  if (!currentTimer) return;
  if (currentTimer.intervalId) clearInterval(currentTimer.intervalId);
  const nodeEl = document.querySelector(`.focus-node[data-id="${currentTimer.focusId}"]`);
  if (nodeEl) nodeEl.classList.remove("in-progress");
  currentTimer = null;
  if (resetText) {
    currentFocusNameEl.textContent = "无";
    countdownTextEl.textContent = "未开始";
  }
  enableTimerButtons(false,false,false);
  resetProgressBar();
  updateInfoPanel();
}

function scheduleTick() {
  if (!currentTimer) return;
  const endTime = Date.now() + currentTimer.remainingMs;
  if (currentTimer.intervalId) clearInterval(currentTimer.intervalId);
  currentTimer.intervalId = setInterval(() => {
    const remaining = endTime - Date.now();
    if (!currentTimer) return;
    if (remaining <= 0) {
      clearInterval(currentTimer.intervalId);
      currentTimer.intervalId = null;
      const focusId  = currentTimer.focusId;
      const duration = currentTimer.totalMs;
      currentTimer.remainingMs = 0;
      updateCountdownText(0);
      updateProgressBar();
      currentTimer = null;
      enableTimerButtons(false,false,false);
      resetProgressBar();
      onFocusCompleted(focusId, duration);
      return;
    }
    currentTimer.remainingMs = remaining;
    updateCountdownText(remaining);
    updateProgressBar();
  }, 1000);
}

/* 侧边栏折叠控制 */
const btnToggleSidebar = document.getElementById("btn-toggle-sidebar");
let sidebarCollapsed = false;

function setSidebarCollapsed(collapsed) {
  sidebarCollapsed = collapsed;
  document.body.classList.toggle("sidebar-collapsed", collapsed);
  btnToggleSidebar.textContent = collapsed ? "显示侧栏" : "隐藏侧栏";
}

btnToggleSidebar.addEventListener("click", () => {
  setSidebarCollapsed(!sidebarCollapsed);
});

function startTimerForFocus(focus, minutes) {
  const totalMs = minutes * 60 * 1000;
  currentTimer = {
    focusId: focus.id,
    totalMs,
    remainingMs: totalMs,
    isPaused: false,
    intervalId: null
  };

  document.querySelectorAll(".focus-node.in-progress").forEach(el => el.classList.remove("in-progress"));
  const nodeEl = document.querySelector(`.focus-node[data-id="${focus.id}"]`);
  if (nodeEl) nodeEl.classList.add("in-progress");

  currentFocusNameEl.textContent = focus.title;
  updateCountdownText(totalMs);
  enableTimerButtons(true,false,true);
  updateProgressBar();
  scheduleTick();
  updateInfoPanel();

  // 开始任务后自动收起侧边栏
  setSidebarCollapsed(true);
}

btnStartFocus.addEventListener("click", () => {
  if (!selectedFocusId) return;
  const focus = focuses.find(f => f.id === selectedFocusId);
  if (!focus) return;

  const isCompleted = state.completed.includes(focus.id);
  const isUnlocked  = checkUnlocked(focus);
  if (!isUnlocked || isCompleted) return;

  if (currentTimer && currentTimer.intervalId && !currentTimer.isPaused) {
    const ok = confirm("当前已有国策在计时中，是否停止并切换到新的国策？");
    if (!ok) return;
    stopCurrentTimer(false);
  }

  const defaultMinutes = focus.defaultMinutes || 25;
  let raw = prompt(
    `为【${focus.title}】设置本次专注时间（分钟）：\n留空或回车将使用默认 ${defaultMinutes} 分钟。`,
    defaultMinutes
  );
  if (raw === null) return;
  raw = String(raw).trim();
  let minutes = raw === "" ? defaultMinutes : parseInt(raw, 10);
  if (isNaN(minutes) || minutes <= 0) {
    alert("请输入一个大于 0 的整数分钟数。");
    return;
  }
  startTimerForFocus(focus, minutes);
});

btnPause.addEventListener("click", () => {
  if (!currentTimer || currentTimer.isPaused || !currentTimer.intervalId) return;
  clearInterval(currentTimer.intervalId);
  currentTimer.intervalId = null;
  currentTimer.isPaused = true;
  updateCountdownText(currentTimer.remainingMs, true);
  enableTimerButtons(false,true,true);
  updateProgressBar();
  updateInfoPanel();
});

btnResume.addEventListener("click", () => {
  if (!currentTimer || !currentTimer.isPaused || currentTimer.remainingMs <= 0) return;
  currentTimer.isPaused = false;
  enableTimerButtons(true,false,true);
  updateProgressBar();
  scheduleTick();
  updateInfoPanel();
});

btnCancel.addEventListener("click", () => {
  if (!currentTimer) return;
  const ok = confirm("确定要取消当前计时吗？不会记录为完成。");
  if (!ok) return;
  stopCurrentTimer(true);
});

/************** 5. 完成逻辑 **************/
const modalOverlay = document.getElementById("modal-overlay");
const modalMessage = document.getElementById("modal-message");
const modalOk      = document.getElementById("modal-ok");

modalOk.addEventListener("click", () => {
  modalOverlay.style.display = "none";
});

function onFocusCompleted(focusId, durationMs) {
  if (!state.completed.includes(focusId)) state.completed.push(focusId);
  if (!state.sessions[focusId]) state.sessions[focusId] = [];
  state.sessions[focusId].push({
    durationMs,
    finishedAt: Date.now()
  });
  saveState();
  updateGlobalStats();

  const nodeEl = document.querySelector(`.focus-node[data-id="${focusId}"]`);
  if (nodeEl) {
    nodeEl.classList.remove("in-progress");
    nodeEl.classList.add("completed");
  }

  const focus   = focuses.find(f => f.id === focusId);
  const title   = focus ? focus.title : focusId;
  const minutes = Math.round(durationMs / 60000);
  modalMessage.textContent =
    `【${title}】本次专注 ${minutes} 分钟已完成！` +
    ` 如有后续国策，它们已自动解锁。`;
  modalOverlay.style.display = "flex";

  renderTree();
  currentFocusNameEl.textContent = "无";
  countdownTextEl.textContent    = "已完成";
  resetProgressBar();
  updateInfoPanel();
}

/************** 6. 平移 + 缩放 **************/
const viewport  = document.getElementById("viewport");
const treeInner = document.getElementById("tree-inner");

let zoom = 1;
let panX = 0;
let panY = 0;

let isPanning  = false;
let panStartX  = 0;
let panStartY  = 0;
let panOriginX = 0;
let panOriginY = 0;

function applyTransform() {
  treeInner.style.transform =
    `translate(${panX}px,${panY}px) scale(${zoom}) translate(-50%,-50%)`;
}

function resetView() {
  zoom = 1;
  panX = 0;
  panY = 0;
  applyTransform();
}

btnResetView.addEventListener("click", resetView);

// 初始
resetView();

// 以鼠标为中心缩放
viewport.addEventListener("wheel", (e) => {
  e.preventDefault();
  const rect = viewport.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  const delta = e.deltaY;
  const factor = delta > 0 ? 0.9 : 1.1;
  const newZoom = Math.min(2.5, Math.max(0.5, zoom * factor));
  const scale = newZoom / zoom;

  panX = panX + (mouseX - centerX) * (1 - scale);
  panY = panY + (mouseY - centerY) * (1 - scale);

  zoom = newZoom;
  applyTransform();
}, { passive: false });

// 拖动画布（只在空白区域按下才开启）
viewport.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  const onNode = e.target.closest(".focus-node");
  if (onNode) return; // 点在国策上，不开启平移
  isPanning  = true;
  panStartX  = e.clientX;
  panStartY  = e.clientY;
  panOriginX = panX;
  panOriginY = panY;
  viewport.style.cursor = "grabbing";
});

window.addEventListener("mousemove", (e) => {
  if (!isPanning) return;
  const dx = e.clientX - panStartX;
  const dy = e.clientY - panStartY;
  panX = panOriginX + dx;
  panY = panOriginY + dy;
  applyTransform();
});

window.addEventListener("mouseup", () => {
  if (isPanning) {
    isPanning = false;
    viewport.style.cursor = "default";
  }
});

/************** 7. 表格配置编辑器逻辑 **************/
const configOverlay    = document.getElementById("config-overlay");
const configTableBody  = document.querySelector("#config-table tbody");
const btnEditConfig    = document.getElementById("btn-edit-config");
const btnConfigClose   = document.getElementById("config-close");
const btnConfigSave    = document.getElementById("config-save");
const btnConfigReset   = document.getElementById("config-reset");

btnEditConfig.addEventListener("click", () => {
  renderConfigEditor();
  configOverlay.style.display = "flex";
});

btnConfigClose.addEventListener("click", () => {
  configOverlay.style.display = "none";
});

btnConfigReset.addEventListener("click", () => {
  if (!confirm("确定恢复默认布局？（只影响国策位置和名字，不清除完成记录）")) return;
  focuses = DEFAULT_FOCUSES.map(f => ({ ...f }));
  saveConfig();
  renderTree();
  updateInfoPanel();
  renderConfigEditor();
});

btnConfigSave.addEventListener("click", () => {
  saveConfig();
  renderTree();
  updateInfoPanel();
  configOverlay.style.display = "none";
});

function renderConfigEditor() {
  configTableBody.innerHTML = "";
  focuses.forEach((f, index) => {
    const tr = document.createElement("tr");

    function makeInputCell(value, onChange, placeholder = "") {
      const td = document.createElement("td");
      const inp = document.createElement("input");
      inp.value = value ?? "";
      if (placeholder) inp.placeholder = placeholder;
      inp.addEventListener("input", () => onChange(inp.value));
      td.appendChild(inp);
      return td;
    }

    const tdId = document.createElement("td");
    tdId.textContent = f.id;
    tr.appendChild(tdId);

    tr.appendChild(
      makeInputCell(f.title, v => { focuses[index].title = v; })
    );

    tr.appendChild(
      makeInputCell(f.branch, v => { focuses[index].branch = v; })
    );

    tr.appendChild(
      makeInputCell(String(f.defaultMinutes ?? 25), v => {
        const n = parseInt(v, 10);
        focuses[index].defaultMinutes = isNaN(n) ? 25 : n;
      }, "分钟")
    );

    tr.appendChild(
      makeInputCell(String(f.row ?? 1), v => {
        const n = parseInt(v, 10);
        focuses[index].row = isNaN(n) ? 1 : n;
      })
    );

    tr.appendChild(
      makeInputCell(String(f.col ?? 1), v => {
        const n = parseInt(v, 10);
        focuses[index].col = isNaN(n) ? 1 : n;
      })
    );

    const dependsStr = Array.isArray(f.dependsOn) ? f.dependsOn.join(",") : "";
    tr.appendChild(
      makeInputCell(dependsStr, v => {
        const arr = v.split(",").map(s => s.trim()).filter(Boolean);
        focuses[index].dependsOn = arr;
      }, "例如：f_main_1,f_write_1")
    );

    tr.appendChild(
      makeInputCell(f.desc || "", v => {
        focuses[index].desc = v;
      }, "说明文本")
    );

    configTableBody.appendChild(tr);
  });
}

/************** 8. 主题颜色逻辑 **************/
const themeOverlay   = document.getElementById("theme-overlay");
const btnTheme       = document.getElementById("btn-theme");
const themeBgInput   = document.getElementById("theme-bg");
const themeGoldInput = document.getElementById("theme-gold");
const themeBlueInput = document.getElementById("theme-blue");
const themeResetBtn  = document.getElementById("theme-reset");
const themeCloseBtn  = document.getElementById("theme-close");

btnTheme.addEventListener("click", () => {
  themeBgInput.value   = theme.bg;
  themeGoldInput.value = theme.gold;
  themeBlueInput.value = theme.blue;
  themeOverlay.style.display = "flex";
});

themeCloseBtn.addEventListener("click", () => {
  themeOverlay.style.display = "none";
});

themeBgInput.addEventListener("input", () => {
  theme.bg = themeBgInput.value;
  applyTheme();
  saveTheme();
});
themeGoldInput.addEventListener("input", () => {
  theme.gold = themeGoldInput.value;
  applyTheme();
  saveTheme();
});
themeBlueInput.addEventListener("input", () => {
  theme.blue = themeBlueInput.value;
  applyTheme();
  saveTheme();
});

themeResetBtn.addEventListener("click", () => {
  theme = { ...defaultTheme };
  applyTheme();
  saveTheme();
  themeBgInput.value   = theme.bg;
  themeGoldInput.value = theme.gold;
  themeBlueInput.value = theme.blue;
});

/************** 9. 初始化 **************/
loadTheme();
loadConfig();
loadState();
updateGlobalStats();

renderTree();
updateInfoPanel();
enableTimerButtons(false,false,false);
resetView();
resetProgressBar();
setSidebarCollapsed(false);  // 初始显示侧栏
