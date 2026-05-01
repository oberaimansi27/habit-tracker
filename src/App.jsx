import { useState, useEffect, useRef } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "habit_app_v2";

const DEFAULT_HABITS = [
  { id: "h1", name: "Journal",          color: "#B07D2A", bg: "#FDF3E3", dot: "#E8A93A" },
  { id: "h2", name: "Exercise",         color: "#2E6B3E", bg: "#E8F5EE", dot: "#3A9E5A" },
  { id: "h3", name: "Skincare routine", color: "#8B3A62", bg: "#F9E8F1", dot: "#C45C8A" },
  { id: "h4", name: "Read 20 pages",   color: "#1A5A9A", bg: "#E5F0FA", dot: "#2E7DD4" },
  { id: "h5", name: "Mindful moment",  color: "#4A2E9A", bg: "#EEEBFA", dot: "#6B52D4" },
  { id: "h6", name: "Sleep 7.5 hrs",  color: "#1A6E6E", bg: "#E3F4F4", dot: "#2A9E9E" },
];

const DEFAULT_MONTHLY = [
  { id: "m1", name: "Review job applications", done: false },
  { id: "m2", name: "Budget check",            done: false },
  { id: "m3", name: "Book any appointments",   done: false },
  { id: "m4", name: "Skin/health check-in",    done: false },
];

const MONTHS       = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS_SHORT   = ["M","T","W","T","F","S","S"];

const PALETTE = [
  { color: "#1A5A9A", bg: "#E5F0FA", dot: "#2E7DD4" },
  { color: "#2E6B3E", bg: "#E8F5EE", dot: "#3A9E5A" },
  { color: "#8B3A62", bg: "#F9E8F1", dot: "#C45C8A" },
  { color: "#B07D2A", bg: "#FDF3E3", dot: "#E8A93A" },
  { color: "#4A2E9A", bg: "#EEEBFA", dot: "#6B52D4" },
  { color: "#1A6E6E", bg: "#E3F4F4", dot: "#2A9E9E" },
  { color: "#8B2A2A", bg: "#FAE8E8", dot: "#C45C5C" },
  { color: "#5A5A5A", bg: "#F2F2F0", dot: "#888"    },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysInMonth(y, m)  { return new Date(y, m + 1, 0).getDate(); }
function todayStr()          { return new Date().toISOString().slice(0, 10); }
function dateKey(y, m, d)   { return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
function monthKey(y, m)     { return `${y}-${m}`; }
function uid()               { return Math.random().toString(36).slice(2, 8); }
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// localStorage helpers (replaces window.storage from Claude)
function lsGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ─── Ring component ───────────────────────────────────────────────────────────

function Ring({ value, size = 80, stroke = 7, color = "#2E7DD4", bg = "#E8EEF5" }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg}    strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.5s ease" }} />
    </svg>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  // ── State ──
  const [screen,         setScreen]         = useState("dashboard");
  const [habits,         setHabits]         = useState(DEFAULT_HABITS);
  const [monthly,        setMonthly]        = useState(DEFAULT_MONTHLY);
  const [checks,         setChecks]         = useState({});
  const [loaded,         setLoaded]         = useState(false);
  const [viewYear,       setViewYear]       = useState(new Date().getFullYear());
  const [viewMonth,      setViewMonth]      = useState(new Date().getMonth());
  const [addingHabit,    setAddingHabit]    = useState(false);
  const [newHabitName,   setNewHabitName]   = useState("");
  const [newHabitColor,  setNewHabitColor]  = useState(0);
  const [addingMonthly,  setAddingMonthly]  = useState(false);
  const [newMonthlyName, setNewMonthlyName] = useState("");
  const [monthlyByMonth, setMonthlyByMonth] = useState({});
  const gridRef = useRef(null);

  // ── Derived date values ──
  const today     = todayStr();
  const todayDate = new Date();
  const curYear   = todayDate.getFullYear();
  const curMonth  = todayDate.getMonth();
  const curDay    = todayDate.getDate();
  const curMKey   = monthKey(curYear, curMonth);
  const numDays   = daysInMonth(viewYear, viewMonth);
  const dayLabels = Array.from({ length: numDays }, (_, i) => i + 1);

  // ── Load from localStorage on mount ──
  useEffect(() => {
    const d = lsGet(STORAGE_KEY);
    if (d) {
      if (d.habits)         setHabits(d.habits);
      if (d.monthly)        setMonthly(d.monthly);
      if (d.checks)         setChecks(d.checks);
      if (d.monthlyByMonth) setMonthlyByMonth(d.monthlyByMonth);
    }
    setLoaded(true);
  }, []);

  // ── Persist to localStorage on every change ──
  useEffect(() => {
    if (!loaded) return;
    lsSet(STORAGE_KEY, { habits, monthly, checks, monthlyByMonth });
  }, [habits, monthly, checks, monthlyByMonth, loaded]);

  // ── Auto-scroll grid to today ──
  useEffect(() => {
    if (screen === "grid" && gridRef.current) {
      gridRef.current.scrollLeft = Math.max(0, (new Date().getDate() - 3) * 38);
    }
  }, [screen]);

  // ── Roll over undone tasks from previous month ──
  useEffect(() => {
    if (!loaded) return;
    const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
    const prevYear  = curMonth === 0 ? curYear - 1 : curYear;
    const prevKey   = monthKey(prevYear, prevMonth);
    const prevTasks = monthlyByMonth[prevKey];
    if (!prevTasks) return;
    const undone = prevTasks.filter(t => !t.done);
    if (undone.length === 0) return;
    const cur = monthlyByMonth[curMKey];
    if (cur) return;
    const merged = [
      ...undone.map(t => ({ ...t, done: false })),
      ...monthly.filter(t => !undone.find(u => u.id === t.id)),
    ];
    setMonthlyByMonth(m => ({ ...m, [curMKey]: merged }));
  }, [loaded]);

  // ── Computed values ──
  const activeMonthly = monthlyByMonth[curMKey] ?? monthly;
  const todayDone     = habits.filter(h => checks[`${today}:${h.id}`]).length;
  const todayTotal    = habits.length;
  const pct           = Math.round((todayDone / todayTotal) * 100);

  function getDayLetter(d) {
    const dow = new Date(viewYear, viewMonth, d).getDay();
    return DAYS_SHORT[dow === 0 ? 6 : dow - 1];
  }

  function goalForHabit(hid) {
    let count = 0;
    for (let d = 1; d <= numDays; d++) {
      const dk = dateKey(viewYear, viewMonth, d);
      if (dk <= today && checks[`${dk}:${hid}`]) count++;
    }
    return count;
  }

  // ── Actions ──
  function toggleCheck(habitId, dk) {
    setChecks(c => ({ ...c, [`${dk}:${habitId}`]: !c[`${dk}:${habitId}`] }));
  }

  function toggleMonthly(id) {
    const cur = monthlyByMonth[curMKey] ?? monthly;
    setMonthlyByMonth(m => ({ ...m, [curMKey]: cur.map(t => t.id === id ? { ...t, done: !t.done } : t) }));
  }

  function addHabit() {
    if (!newHabitName.trim()) return;
    const p = PALETTE[newHabitColor];
    setHabits(h => [...h, { id: uid(), name: newHabitName.trim(), color: p.color, bg: p.bg, dot: p.dot }]);
    setNewHabitName(""); setAddingHabit(false);
  }

  function deleteHabit(id) { setHabits(h => h.filter(x => x.id !== id)); }

  function addMonthlyTask() {
    if (!newMonthlyName.trim()) return;
    const t = { id: uid(), name: newMonthlyName.trim(), done: false };
    setMonthly(m => [...m, t]);
    const cur = monthlyByMonth[curMKey] ?? monthly;
    setMonthlyByMonth(m => ({ ...m, [curMKey]: [...cur, t] }));
    setNewMonthlyName(""); setAddingMonthly(false);
  }

  function deleteMonthlyTask(id) {
    setMonthly(m => m.filter(x => x.id !== id));
    const cur = monthlyByMonth[curMKey] ?? monthly;
    setMonthlyByMonth(m => ({ ...m, [curMKey]: cur.filter(x => x.id !== id) }));
  }

  function exportData() {
    const data = { habits, monthly, checks, monthlyByMonth, exportedAt: new Date().toISOString() };
    const blob  = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement("a");
    a.href = url; a.download = `habit-tracker-backup-${todayStr()}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result);
        if (d.habits)         setHabits(d.habits);
        if (d.monthly)        setMonthly(d.monthly);
        if (d.checks)         setChecks(d.checks);
        if (d.monthlyByMonth) setMonthlyByMonth(d.monthlyByMonth);
        alert("Data imported successfully!");
      } catch { alert("Invalid backup file."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ── Design tokens ──
  const APP_BG       = "#F7F4EF";
  const CARD_BG      = "#FFFFFF";
  const BORDER       = "#E8E4DE";
  const TEXT_PRIMARY = "#1A1A18";
  const TEXT_SEC     = "#6B6862";
  const ACCENT       = "#1A5A9A";
  const ACCENT_LIGHT = "#E5F0FA";

  const card = {
    background: CARD_BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 18,
    padding: "1.25rem",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  };

  const navBtn = active => ({
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    border: "none", background: "transparent", cursor: "pointer",
    padding: "6px 20px",
    color: active ? ACCENT : TEXT_SEC,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: APP_BG, minHeight: "100vh", fontFamily: "system-ui, sans-serif", paddingBottom: 80 }}>

      {/* ══════════════════ DASHBOARD ══════════════════ */}
      {screen === "dashboard" && (
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ padding: "1.5rem 1.25rem 1rem", background: CARD_BG, borderBottom: `1px solid ${BORDER}`, marginBottom: "1rem" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 500, letterSpacing: 1, color: TEXT_SEC, textTransform: "uppercase" }}>
              {todayDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 500, color: TEXT_PRIMARY }}>
              {getGreeting()}, Mansi ✦
            </p>
          </div>

          <div style={{ padding: "0 1rem" }}>
            {/* Summary card */}
            <div style={{ ...card, display: "flex", alignItems: "center", gap: 20, marginBottom: "1rem", background: ACCENT, border: "none" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <Ring value={pct} size={76} stroke={7} color="#fff" bg="rgba(255,255,255,0.25)" />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 600, color: "#fff" }}>{pct}%</div>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 600, color: "#fff", lineHeight: 1 }}>
                  {todayDone}<span style={{ fontSize: 16, fontWeight: 400, opacity: 0.75 }}> / {todayTotal}</span>
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,0.8)" }}>habits completed today</p>
                <div style={{ marginTop: 10, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.25)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "#fff", borderRadius: 99, transition: "width 0.5s ease" }} />
                </div>
              </div>
            </div>

            {/* Export / Import */}
            <div style={{ ...card, marginBottom: "1rem", display: "flex", gap: 10 }}>
              <button onClick={exportData} style={{ flex: 1, padding: "11px", borderRadius: 12, border: `1px solid ${BORDER}`, background: "#FAFAF8", color: TEXT_PRIMARY, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                <svg width={15} height={15} viewBox="0 0 15 15" fill="none">
                  <path d="M7.5 1v9M4 7l3.5 3.5L11 7" stroke={TEXT_PRIMARY} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12h11" stroke={TEXT_PRIMARY} strokeWidth={1.5} strokeLinecap="round"/>
                </svg>
                Export backup
              </button>
              <label style={{ flex: 1, padding: "11px", borderRadius: 12, border: `1px solid ${BORDER}`, background: "#FAFAF8", color: TEXT_PRIMARY, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                <svg width={15} height={15} viewBox="0 0 15 15" fill="none">
                  <path d="M7.5 10V1M4 4l3.5-3.5L11 4" stroke={TEXT_PRIMARY} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12h11" stroke={TEXT_PRIMARY} strokeWidth={1.5} strokeLinecap="round"/>
                </svg>
                Import backup
                <input type="file" accept=".json" onChange={importData} style={{ display: "none" }} />
              </label>
            </div>

            {/* Today's habits */}
            <div style={{ ...card, marginBottom: "1rem" }}>
              <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 500, color: TEXT_SEC, letterSpacing: 0.5, textTransform: "uppercase" }}>Today's habits</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {habits.map(h => {
                  const done = !!checks[`${today}:${h.id}`];
                  return (
                    <div key={h.id} onClick={() => toggleCheck(h.id, today)}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 12,
                        background: done ? h.bg : "#FAFAF8", border: `1px solid ${done ? h.dot + "55" : BORDER}`,
                        cursor: "pointer", transition: "all 0.2s" }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        border: `2px solid ${done ? h.dot : "#CCC"}`,
                        background: done ? h.dot : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                        {done && <svg width={11} height={11} viewBox="0 0 11 11"><polyline points="1.5,5.5 4,8 9.5,2.5" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <span style={{ fontSize: 14, color: done ? h.color : TEXT_PRIMARY, textDecoration: done ? "line-through" : "none", fontWeight: done ? 500 : 400 }}>{h.name}</span>
                      <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: h.dot, opacity: done ? 1 : 0.3 }} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Nav cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1rem" }}>
              <div onClick={() => setScreen("grid")} style={{ ...card, cursor: "pointer", textAlign: "center", padding: "1.5rem 1rem" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: ACCENT_LIGHT, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width={22} height={22} viewBox="0 0 22 22" fill="none">
                    <rect x={2}  y={2}  width={7} height={7} rx={2} fill={ACCENT}/>
                    <rect x={13} y={2}  width={7} height={7} rx={2} fill={ACCENT} opacity={0.4}/>
                    <rect x={2}  y={13} width={7} height={7} rx={2} fill={ACCENT} opacity={0.4}/>
                    <rect x={13} y={13} width={7} height={7} rx={2} fill={ACCENT} opacity={0.7}/>
                  </svg>
                </div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: TEXT_PRIMARY }}>Monthly grid</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: TEXT_SEC }}>Track across the month</p>
              </div>
              <div onClick={() => setScreen("monthly")} style={{ ...card, cursor: "pointer", textAlign: "center", padding: "1.5rem 1rem" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "#EBF5EC", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width={22} height={22} viewBox="0 0 22 22" fill="none">
                    <rect x={3} y={3} width={16} height={16} rx={3} stroke="#2E6B3E" strokeWidth={1.5}/>
                    <polyline points="7,11 9.5,13.5 15,8" stroke="#2E6B3E" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                </div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: TEXT_PRIMARY }}>Monthly tasks</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: TEXT_SEC }}>{activeMonthly.filter(t => t.done).length}/{activeMonthly.length} done</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ GRID ══════════════════ */}
      {screen === "grid" && (
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ padding: "1.25rem 1.25rem 1rem", background: CARD_BG, borderBottom: `1px solid ${BORDER}`, marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 500, color: TEXT_PRIMARY }}>Monthly grid</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: TEXT_SEC }}>Tap a cell to mark done</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F2EFE9", borderRadius: 10, padding: "4px 6px" }}>
              <button onClick={() => { if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11); } else setViewMonth(m => m-1); }}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: TEXT_SEC, fontSize: 16, padding: "2px 6px" }}>‹</button>
              <span style={{ fontSize: 13, fontWeight: 500, minWidth: 80, textAlign: "center", color: TEXT_PRIMARY }}>{MONTHS_SHORT[viewMonth]} {viewYear}</span>
              <button onClick={() => { if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0); } else setViewMonth(m => m+1); }}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: TEXT_SEC, fontSize: 16, padding: "2px 6px" }}>›</button>
            </div>
          </div>

          <div style={{ padding: "0 1rem" }}>
            <div style={{ ...card, padding: 0, overflow: "hidden" }}>
              <div ref={gridRef} style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", tableLayout: "fixed", minWidth: "100%" }}>
                  <colgroup>
                    <col style={{ width: 110 }} />
                    {dayLabels.map(d => <col key={d} style={{ width: 36 }} />)}
                    <col style={{ width: 44 }} />
                    <col style={{ width: 44 }} />
                  </colgroup>
                  <thead>
                    <tr style={{ background: "#FAFAF8" }}>
                      <th style={{ padding: "10px 12px", fontSize: 11, color: TEXT_SEC, textAlign: "left", fontWeight: 500, borderBottom: `1px solid ${BORDER}` }}>Habit</th>
                      {dayLabels.map(d => {
                        const dk = dateKey(viewYear, viewMonth, d);
                        const isToday = dk === today;
                        return (
                          <th key={d} style={{ textAlign: "center", padding: "6px 0 8px", fontSize: 9, borderBottom: `1px solid ${BORDER}`, background: isToday ? ACCENT_LIGHT : "transparent" }}>
                            <div style={{ color: isToday ? ACCENT : TEXT_SEC, fontWeight: isToday ? 700 : 400 }}>{getDayLetter(d)}</div>
                            <div style={{ color: isToday ? ACCENT : TEXT_SEC, fontWeight: isToday ? 700 : 400, fontSize: 10 }}>{d}</div>
                          </th>
                        );
                      })}
                      <th style={{ fontSize: 9, color: ACCENT,    textAlign: "center", fontWeight: 600, borderBottom: `1px solid ${BORDER}`, padding: "6px 0" }}>Goal</th>
                      <th style={{ fontSize: 9, color: "#2E6B3E", textAlign: "center", fontWeight: 600, borderBottom: `1px solid ${BORDER}`, padding: "6px 0" }}>Done</th>
                    </tr>
                  </thead>
                  <tbody>
                    {habits.map((h, ri) => {
                      const achieved = goalForHabit(h.id);
                      const daysGone = viewYear === curYear && viewMonth === curMonth
                        ? curDay
                        : (viewYear < curYear || (viewYear === curYear && viewMonth < curMonth)) ? numDays : 0;
                      return (
                        <tr key={h.id} style={{ borderBottom: ri < habits.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                          <td style={{ padding: "6px 12px", fontSize: 11, color: TEXT_PRIMARY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 110, borderRight: `1px solid ${BORDER}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 7, height: 7, borderRadius: "50%", background: h.dot, flexShrink: 0 }} />
                              {h.name}
                            </div>
                          </td>
                          {dayLabels.map(d => {
                            const dk      = dateKey(viewYear, viewMonth, d);
                            const done    = !!checks[`${dk}:${h.id}`];
                            const future  = dk > today;
                            const isToday = dk === today;
                            return (
                              <td key={d} onClick={() => !future && toggleCheck(h.id, dk)}
                                style={{ textAlign: "center", padding: 2, cursor: future ? "default" : "pointer", background: isToday ? "#EEF5FC" : "transparent" }}>
                                <div style={{ width: 26, height: 26, borderRadius: 7, margin: "0 auto",
                                  background: done ? h.bg : "transparent",
                                  border: `1px solid ${done ? h.dot : isToday ? ACCENT + "55" : "transparent"}`,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  opacity: future ? 0.25 : 1, transition: "all 0.15s" }}>
                                  {done && <svg width={10} height={10} viewBox="0 0 10 10"><polyline points="1.5,5.5 4,8 8.5,2" fill="none" stroke={h.dot} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </div>
                              </td>
                            );
                          })}
                          <td style={{ textAlign: "center", fontSize: 12, fontWeight: 500, color: ACCENT }}>{daysGone}</td>
                          <td style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: achieved >= daysGone && daysGone > 0 ? "#2E6B3E" : achieved > 0 ? "#B07D2A" : TEXT_SEC }}>{achieved}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "12px 4px" }}>
              {habits.map(h => (
                <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: TEXT_SEC }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: h.dot }} />
                  {h.name}
                </div>
              ))}
            </div>

            <div style={{ marginTop: "0.5rem" }}>
              {addingHabit ? (
                <div style={{ ...card, display: "flex", flexDirection: "column", gap: 12 }}>
                  <input value={newHabitName} onChange={e => setNewHabitName(e.target.value)}
                    placeholder="Habit name…" onKeyDown={e => e.key === "Enter" && addHabit()}
                    style={{ fontSize: 14, padding: "10px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "#FAFAF8", color: TEXT_PRIMARY, outline: "none" }} autoFocus />
                  <div style={{ display: "flex", gap: 8 }}>
                    {PALETTE.map((p, i) => (
                      <div key={i} onClick={() => setNewHabitColor(i)}
                        style={{ width: 26, height: 26, borderRadius: "50%", background: p.dot,
                          outline: newHabitColor === i ? `3px solid ${p.dot}` : "none",
                          outlineOffset: 2, cursor: "pointer" }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={addHabit} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: ACCENT, color: "#fff", fontWeight: 500, fontSize: 13, cursor: "pointer" }}>Add habit</button>
                    <button onClick={() => setAddingHabit(false)} style={{ padding: "10px 16px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT_SEC, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingHabit(true)}
                  style={{ width: "100%", padding: "12px", borderRadius: 12, border: `1.5px dashed ${BORDER}`, background: "transparent", color: TEXT_SEC, fontSize: 13, cursor: "pointer", marginBottom: 12 }}>
                  + New habit
                </button>
              )}
              {!addingHabit && habits.map(h => (
                <div key={h.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 4px", borderBottom: `1px solid ${BORDER}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: h.dot }} />
                    <span style={{ fontSize: 13, color: TEXT_PRIMARY }}>{h.name}</span>
                  </div>
                  <button onClick={() => deleteHabit(h.id)} style={{ border: "none", background: "transparent", color: "#CCC", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 8px" }}>×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ MONTHLY TASKS ══════════════════ */}
      {screen === "monthly" && (
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ padding: "1.25rem 1.25rem 1rem", background: CARD_BG, borderBottom: `1px solid ${BORDER}`, marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 500, color: TEXT_PRIMARY }}>Monthly tasks</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: TEXT_SEC }}>{MONTHS[curMonth]} {curYear}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 500, color: "#2E6B3E" }}>
                {activeMonthly.filter(t => t.done).length}
                <span style={{ fontSize: 14, color: TEXT_SEC, fontWeight: 400 }}>/{activeMonthly.length}</span>
              </p>
              <p style={{ margin: 0, fontSize: 11, color: TEXT_SEC }}>completed</p>
            </div>
          </div>

          <div style={{ padding: "0 1rem" }}>
            <div style={{ height: 6, borderRadius: 99, background: BORDER, overflow: "hidden", marginBottom: "1.25rem" }}>
              <div style={{ height: "100%", borderRadius: 99, background: "#2E6B3E",
                width: `${Math.round((activeMonthly.filter(t=>t.done).length / Math.max(activeMonthly.length,1)) * 100)}%`,
                transition: "width 0.4s ease" }} />
            </div>

            <div style={{ ...card }}>
              {activeMonthly.map((task, i) => (
                <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderBottom: i < activeMonthly.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                  <div onClick={() => toggleMonthly(task.id)}
                    style={{ width: 24, height: 24, borderRadius: 7,
                      border: `2px solid ${task.done ? "#2E6B3E" : "#CCC"}`,
                      background: task.done ? "#2E6B3E" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, cursor: "pointer", transition: "all 0.2s" }}>
                    {task.done && <svg width={12} height={12} viewBox="0 0 12 12"><polyline points="2,6.5 4.5,9 10,3" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{ flex: 1, fontSize: 14, color: task.done ? TEXT_SEC : TEXT_PRIMARY, textDecoration: task.done ? "line-through" : "none", transition: "all 0.2s" }}>{task.name}</span>
                  <button onClick={() => deleteMonthlyTask(task.id)} style={{ border: "none", background: "transparent", color: "#CCC", cursor: "pointer", fontSize: 18, padding: "0 4px" }}>×</button>
                </div>
              ))}

              {addingMonthly ? (
                <div style={{ paddingTop: 14, display: "flex", gap: 8 }}>
                  <input value={newMonthlyName} onChange={e => setNewMonthlyName(e.target.value)}
                    placeholder="Add a task…" onKeyDown={e => e.key === "Enter" && addMonthlyTask()}
                    style={{ flex: 1, fontSize: 14, padding: "10px 12px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "#FAFAF8", color: TEXT_PRIMARY, outline: "none" }} autoFocus />
                  <button onClick={addMonthlyTask} style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: "#2E6B3E", color: "#fff", fontWeight: 500, fontSize: 13, cursor: "pointer" }}>Add</button>
                  <button onClick={() => setAddingMonthly(false)} style={{ padding: "10px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT_SEC, fontSize: 13, cursor: "pointer" }}>✕</button>
                </div>
              ) : (
                <button onClick={() => setAddingMonthly(true)}
                  style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1.5px dashed ${BORDER}`, background: "transparent", color: TEXT_SEC, fontSize: 13, cursor: "pointer", marginTop: 12 }}>
                  + Add task
                </button>
              )}
            </div>
            <p style={{ fontSize: 11, color: TEXT_SEC, textAlign: "center", marginTop: "1rem", opacity: 0.7 }}>
              Completed tasks clear at month end — undone tasks carry over
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════ BOTTOM NAV ══════════════════ */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: CARD_BG, borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-around", padding: "8px 0 14px", zIndex: 100 }}>
        {[
          { id: "dashboard", label: "Home",
            icon: a => <svg width={22} height={22} viewBox="0 0 22 22" fill="none"><path d="M3 10L11 3L19 10V19H14V14H8V19H3V10Z" stroke={a ? ACCENT : TEXT_SEC} strokeWidth={1.5} strokeLinejoin="round" fill={a ? ACCENT_LIGHT : "none"}/></svg> },
          { id: "grid", label: "Grid",
            icon: a => <svg width={22} height={22} viewBox="0 0 22 22" fill="none"><rect x={3} y={3} width={7} height={7} rx={2} fill={a ? ACCENT : "none"} stroke={a ? ACCENT : TEXT_SEC} strokeWidth={1.5}/><rect x={12} y={3} width={7} height={7} rx={2} fill={a ? ACCENT_LIGHT : "none"} stroke={a ? ACCENT : TEXT_SEC} strokeWidth={1.5}/><rect x={3} y={12} width={7} height={7} rx={2} fill={a ? ACCENT_LIGHT : "none"} stroke={a ? ACCENT : TEXT_SEC} strokeWidth={1.5}/><rect x={12} y={12} width={7} height={7} rx={2} fill={a ? ACCENT : "none"} stroke={a ? ACCENT : TEXT_SEC} strokeWidth={1.5}/></svg> },
          { id: "monthly", label: "Tasks",
            icon: a => <svg width={22} height={22} viewBox="0 0 22 22" fill="none"><rect x={3} y={3} width={16} height={16} rx={3} fill={a ? ACCENT_LIGHT : "none"} stroke={a ? ACCENT : TEXT_SEC} strokeWidth={1.5}/><polyline points="7,11 9.5,13.5 15,8" stroke={a ? ACCENT : TEXT_SEC} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg> },
        ].map(n => {
          const active = screen === n.id;
          return (
            <button key={n.id} onClick={() => setScreen(n.id)} style={navBtn(active)}>
              {n.icon(active)}
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{n.label}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
}
