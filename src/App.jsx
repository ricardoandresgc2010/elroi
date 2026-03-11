import { useState, useRef, useCallback, useEffect } from "react";

// ─── IMAGINAMOS DNA ────────────────────────────────────────────────────────

const IMAGINAMOS_DNA = {
  company: "Imaginamos",
  website: "https://imaginamos.com",
  description: "Empresa colombiana de transformación digital e innovación de negocios. Desarrollan software a medida, apps móviles, estrategia digital, UX/UI, marketing digital e integración de Inteligencia Artificial. Trabajan con más de 1000 clientes en diversos sectores (Rappi, Davivienda, ETB, Alpina, Colombina, entre otros).",
  values: ["Innovación", "Resultados", "AI First"],
  culture: "Cultura tech, ágil y orientada a resultados. Valoran profundamente la mentalidad AI First — las personas deben no solo entender IA sino adoptarla como herramienta cotidiana. Buscan personas que se automotiven, que resuelvan problemas de forma creativa y que entreguen valor real a los clientes. Ambiente dinámico, startup-minded, con metodologías ágiles.",
  mustHave: [
    "Mentalidad AI First — usa IA en su trabajo diario",
    "Orientación a resultados y entrega de valor",
    "Capacidad de trabajar en entornos ágiles y cambiantes",
    "Pasión genuina por la tecnología e innovación",
    "Comunicación clara y trabajo en equipo remoto/híbrido"
  ],
  redFlags: [
    "No usa herramientas de IA en su trabajo",
    "Perfil muy rígido o resistente al cambio",
    "Sin experiencia en metodologías ágiles",
    "Expectativas salariales muy por encima del mercado sin justificación",
    "Sin proyectos propios o portfolio demostrable"
  ],
  frequentRoles: [
    {
      title: "Product Manager (PM)",
      keySkills: ["Gestión de producto digital", "OKRs y métricas", "Trabajo con equipos técnicos", "Roadmapping", "Metodologías ágiles (Scrum/Kanban)", "Uso de IA para análisis y automatización"],
      niceToHave: ["Experiencia en startups o empresas de tecnología", "Conocimiento técnico básico de desarrollo"],
      defaultCriteria: [
        { name: "Experiencia en producto digital", weight: 30 },
        { name: "Mentalidad AI First", weight: 25 },
        { name: "Orientación a resultados / métricas", weight: 20 },
        { name: "Habilidades de liderazgo y comunicación", weight: 15 },
        { name: "Fit cultural Imaginamos", weight: 10 }
      ]
    },
    {
      title: "Desarrollador Backend",
      keySkills: ["Node.js / Python / Java", "APIs REST y GraphQL", "Bases de datos SQL y NoSQL", "Cloud (AWS/GCP/Azure)", "Integración de IA/LLMs"],
      niceToHave: ["Experiencia con microservicios", "DevOps / CI-CD", "Contribuciones open source"],
      defaultCriteria: [
        { name: "Dominio técnico backend", weight: 35 },
        { name: "Experiencia con cloud e integraciones", weight: 20 },
        { name: "Mentalidad AI First", weight: 20 },
        { name: "Calidad de código y buenas prácticas", weight: 15 },
        { name: "Fit cultural Imaginamos", weight: 10 }
      ]
    },
    {
      title: "Desarrollador Frontend",
      keySkills: ["React / Vue / Angular", "HTML, CSS, JavaScript avanzado", "Responsive design", "Integración con APIs", "Uso de IA para generación de UI"],
      niceToHave: ["Nociones de UX/UI", "Experiencia con design systems", "Performance web"],
      defaultCriteria: [
        { name: "Dominio técnico frontend", weight: 35 },
        { name: "Calidad visual y UX awareness", weight: 20 },
        { name: "Mentalidad AI First", weight: 20 },
        { name: "Portfolio / proyectos demostrables", weight: 15 },
        { name: "Fit cultural Imaginamos", weight: 10 }
      ]
    }
  ]
};

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────

function buildSystemPrompt(memory) {
  const memoryText = memory.length > 0
    ? `\n\nAPRENDIZAJES PREVIOS DE PROCESOS EN IMAGINAMOS:\n${memory.map((m, i) => `${i + 1}. ${m}`).join("\n")}`
    : "";

  return `Eres ELROI (אֵל רֳאִי — El Dios que me ve), el asistente de reclutamiento inteligente de IMAGINAMOS.

Conoces profundamente el ADN de Imaginamos:
- EMPRESA: ${IMAGINAMOS_DNA.description}
- VALORES: ${IMAGINAMOS_DNA.values.join(", ")}
- CULTURA: ${IMAGINAMOS_DNA.culture}
- MUST HAVE en todo candidato: ${IMAGINAMOS_DNA.mustHave.join(" | ")}
- RED FLAGS universales: ${IMAGINAMOS_DNA.redFlags.join(" | ")}

ROLES FRECUENTES EN IMAGINAMOS:
${IMAGINAMOS_DNA.frequentRoles.map(r => `- ${r.title}: requiere ${r.keySkills.slice(0, 3).join(", ")}`).join("\n")}
${memoryText}

TUS CAPACIDADES:
1. ASESORAR sobre perfiles, criterios y estrategia de reclutamiento para Imaginamos
2. GENERAR preguntas de entrevista alineadas con la cultura AI First de Imaginamos
3. EVALUAR perfiles descritos por el reclutador
4. APRENDER y recordar patrones de lo que funciona en Imaginamos
5. SUGERIR criterios de evaluación basados en el ADN de la empresa

PERSONALIDAD: Eres directo, analítico y orientado a resultados — como Imaginamos. Usas lenguaje profesional pero cercano. Cuando detectas algo que NO encaja con el ADN de Imaginamos, lo dices claramente.

Responde SIEMPRE en español. Cuando des evaluaciones, sé estructurado y usa el ADN de Imaginamos como filtro principal.`;
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function readFileAsBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = () => rej(new Error("Error leyendo archivo"));
    r.readAsDataURL(file);
  });
}

function exportToCSV(candidates, criteria, jobTitle) {
  const criteriaHeaders = criteria.map(c => `"${c.name} (${c.weight}%)"`).join(",");
  const header = `"Posición","Nombre","Cargo","Puntaje Total","Recomendación",${criteriaHeaders},"Fortalezas","Alertas"\n`;
  const rows = candidates.map((c, i) => {
    const criteriaScores = criteria.map(cr => {
      const s = c.scores?.find(s => s.criterio === cr.name);
      return `"${s ? s.puntaje + "/10" : "N/A"}"`;
    }).join(",");
    return `"${i + 1}","${c.name}","${jobTitle}","${c.totalScore}/10","${c.recommendation}",${criteriaScores},"${(c.strengths || []).join("; ")}","${(c.alerts || []).join("; ")}"`;
  }).join("\n");
  const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `ELROI_${jobTitle.replace(/\s/g, "_")}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─── STYLES ───────────────────────────────────────────────────────────────

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Lato:wght@300;400;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#0a0806;--surface:#141008;--surface2:#1e1810;
  --ink:#f5f0e8;--ink2:#b8a98a;--ink3:#6b5f48;
  --gold:#c9a84c;--gold2:#e8c97a;--gold-light:rgba(201,168,76,0.08);
  --green:#4a9e6b;--green-light:rgba(74,158,107,0.12);
  --yellow:#c49a1a;--yellow-light:rgba(196,154,26,0.12);
  --red:#c84b31;--red-light:rgba(200,75,49,0.12);
  --border:rgba(201,168,76,0.12);--shadow:0 4px 24px rgba(0,0,0,0.5);
}
body{font-family:'Lato',sans-serif;background:var(--bg);}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
@keyframes glow{0%,100%{text-shadow:0 0 20px rgba(201,168,76,0.3)}50%{text-shadow:0 0 40px rgba(201,168,76,0.8)}}
@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
.fade-up{animation:fadeUp 0.4s ease both;}
.card{background:var(--surface);border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow);}
.btn-gold{background:linear-gradient(135deg,var(--gold),var(--gold2));color:#0a0806;border:none;border-radius:10px;padding:11px 24px;font-family:'Lato',sans-serif;font-weight:700;font-size:13px;cursor:pointer;transition:all 0.2s;letter-spacing:0.5px;}
.btn-gold:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(201,168,76,0.35);}
.btn-gold:disabled{background:var(--surface2);color:var(--ink3);cursor:not-allowed;transform:none;box-shadow:none;}
.btn-ghost{background:transparent;color:var(--ink2);border:1px solid var(--border);border-radius:10px;padding:9px 18px;font-family:'Lato',sans-serif;font-size:13px;cursor:pointer;transition:all 0.2s;}
.btn-ghost:hover{border-color:var(--gold);color:var(--gold);}
.input{width:100%;padding:11px 14px;border:1.5px solid var(--border);border-radius:10px;font-family:'Lato',sans-serif;font-size:13px;color:var(--ink);background:var(--surface2);transition:border 0.2s;}
.input:focus{outline:none;border-color:var(--gold);}
.input::placeholder{color:var(--ink3);}
.tag{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.3px;}
.tag-green{background:var(--green-light);color:var(--green);}
.tag-yellow{background:var(--yellow-light);color:var(--yellow);}
.tag-red{background:var(--red-light);color:var(--red);}
.tab{padding:10px 18px;border:none;background:transparent;font-family:'Lato',sans-serif;font-size:12px;font-weight:700;color:var(--ink3);cursor:pointer;border-bottom:2px solid transparent;transition:all 0.2s;letter-spacing:1px;text-transform:uppercase;}
.tab.active{color:var(--gold);border-bottom-color:var(--gold);}
.nav-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;cursor:pointer;transition:all 0.2s;border:none;background:transparent;width:100%;text-align:left;font-family:'Lato',sans-serif;font-size:13px;color:var(--ink3);}
.nav-item:hover,.nav-item.active{background:var(--gold-light);color:var(--gold);}
.drop-zone{border:2px dashed var(--border);border-radius:12px;padding:28px;text-align:center;cursor:pointer;transition:all 0.2s;}
.drop-zone:hover,.drop-zone.dragover{border-color:var(--gold);background:var(--gold-light);}
.scrollbar::-webkit-scrollbar{width:3px;}
.scrollbar::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px;}
.memory-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;background:var(--gold-light);border:1px solid var(--border);border-radius:20px;font-size:12px;color:var(--ink2);margin:3px;}
`;

// ─── CONFIG ────────────────────────────────────────────────────────────────
const APP_PASSWORD = "RichIA";
const API_KEY = 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 "";

// ─── PASSWORD SCREEN ───────────────────────────────────────────────────────

function PasswordScreen({ onConfirm }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);

  function handleConfirm() {
    if (password === APP_PASSWORD) {
      onConfirm();
    } else {
      setError("Contraseña incorrecta. Intenta de nuevo.");
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  }

  return (
    <div className="fade-up" style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}`}</style>
      <div style={{ width: "100%", maxWidth: "400px", textAlign: "center" }}>
        <div style={{ fontSize: "52px", marginBottom: "16px", animation: "glow 3s ease-in-out infinite" }}>👁️</div>
        <div style={{ fontFamily: "'Cinzel'", fontSize: "44px", fontWeight: "900", color: "var(--gold)", letterSpacing: "6px", marginBottom: "4px" }}>ELROI</div>
        <div style={{ fontFamily: "'Cinzel'", fontSize: "12px", color: "var(--ink3)", letterSpacing: "3px", marginBottom: "4px" }}>אֵל רֳאִי · El Dios que me ve</div>
        <div style={{ fontSize: "13px", color: "var(--ink2)", marginBottom: "8px", fontStyle: "italic" }}>Sistema de Reclutamiento Inteligente</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 14px", background: "var(--gold-light)", border: "1px solid var(--border)", borderRadius: "20px", fontSize: "12px", color: "var(--gold)", marginBottom: "36px", fontWeight: "700" }}>
          ⚡ IMAGINAMOS
        </div>
        <div className="card" style={{ padding: "28px", textAlign: "left", animation: shaking ? "shake 0.4s ease" : "none" }}>
          <h3 style={{ fontFamily: "'Cinzel'", fontSize: "14px", color: "var(--gold)", marginBottom: "6px", letterSpacing: "1px" }}>ACCESO AL SISTEMA</h3>
          <p style={{ fontSize: "12px", color: "var(--ink3)", marginBottom: "16px", lineHeight: "1.6" }}>
            Ingresa la contraseña para acceder a ELROI
          </p>
          <input
            className="input"
            type="password"
            placeholder="Contraseña..."
            value={password}
            onChange={e => { setPassword(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleConfirm()}
            style={{ marginBottom: "10px", fontSize: "14px", letterSpacing: "2px" }}
            autoFocus
          />
          {error && (
            <div style={{ fontSize: "12px", color: "var(--red)", marginBottom: "10px", padding: "8px 12px", background: "var(--red-light)", borderRadius: "8px" }}>
              {error}
            </div>
          )}
          <button className="btn-gold" onClick={handleConfirm} disabled={!password} style={{ width: "100%" }}>
            Entrar a ELROI →
          </button>
          <p style={{ fontSize: "11px", color: "var(--ink3)", marginTop: "12px", textAlign: "center" }}>
            Acceso exclusivo para el equipo de People · Imaginamos
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── CHAT MODULE ──────────────────────────────────────────────────────────

function ChatModule({ apiKey, memory, onLearn }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const convRef = useRef([]);
  const endRef = useRef();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const quickActions = [
    { icon: "💼", label: "Perfil PM", prompt: "¿Qué perfil ideal busca Imaginamos para un Product Manager?" },
    { icon: "⚙️", label: "Preguntas Backend", prompt: "Genera preguntas de entrevista para un Desarrollador Backend en Imaginamos, enfocadas en AI First" },
    { icon: "🎨", label: "Preguntas Frontend", prompt: "Genera preguntas de entrevista para un Desarrollador Frontend en Imaginamos" },
    { icon: "🔍", label: "Evaluar perfil", prompt: "Quiero que evalúes el perfil de un candidato para Imaginamos, te describo su experiencia" },
  ];

  async function callClaude(userMsg) {
    convRef.current = [...convRef.current, { role: "user", content: userMsg }];
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", max_tokens: 1000,
        system: buildSystemPrompt(memory),
        messages: convRef.current
      })
    });
    const data = await res.json();
    const text = data.content?.map(b => b.text || "").join("") || "Error al responder.";
    convRef.current = [...convRef.current, { role: "assistant", content: text }];

    // Auto-learn: if response contains insights about Imaginamos patterns
    if (text.includes("Imaginamos") && (text.includes("perfil ideal") || text.includes("recomiendo") || text.includes("aprendizaje"))) {
      const shortInsight = `Chat: ${userMsg.substring(0, 60)}... → ELROI identificó patrones relevantes para Imaginamos`;
      onLearn(shortInsight);
    }
    return text;
  }

  async function sendMessage(text) {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput(""); setStarted(true);
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);
    const reply = await callClaude(msg);
    setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    setLoading(false);
  }

  async function startChat() {
    setStarted(true); setLoading(true);
    const reply = await callClaude("Preséntate brevemente y dime cómo puedes ayudarme hoy en el proceso de reclutamiento de Imaginamos.");
    setMessages([{ role: "assistant", content: reply }]);
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="scrollbar" style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {!started ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px", gap: "24px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>💬</div>
              <h3 style={{ fontFamily: "'Cinzel'", fontSize: "18px", color: "var(--gold)", marginBottom: "6px", letterSpacing: "1px" }}>CONSULTA A ELROI</h3>
              <p style={{ fontSize: "13px", color: "var(--ink3)", maxWidth: "340px", lineHeight: "1.6" }}>ELROI ya conoce el ADN de Imaginamos. Pregúntale sobre perfiles, entrevistas o estrategia de reclutamiento.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", width: "100%", maxWidth: "480px" }}>
              {quickActions.map((a, i) => (
                <button key={i} className="btn-ghost" onClick={() => sendMessage(a.prompt)}
                  style={{ padding: "12px 14px", textAlign: "left", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: "700" }}>
                  <span>{a.icon}</span>{a.label}
                </button>
              ))}
            </div>
            <button className="btn-gold" onClick={startChat}>Iniciar conversación →</button>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: "14px" }} className="fade-up">
                {m.role === "assistant" && <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "linear-gradient(135deg,var(--gold),var(--gold2))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", marginRight: "8px", flexShrink: 0 }}>👁️</div>}
                <div style={{ maxWidth: "75%", padding: "12px 16px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.role === "user" ? "linear-gradient(135deg,var(--gold),var(--gold2))" : "var(--surface2)", color: m.role === "user" ? "#0a0806" : "var(--ink)", fontSize: "13px", lineHeight: "1.65", border: m.role === "assistant" ? "1px solid var(--border)" : "none", whiteSpace: "pre-wrap", fontWeight: m.role === "user" ? "700" : "400" }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "linear-gradient(135deg,var(--gold),var(--gold2))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>👁️</div>
                <div style={{ padding: "12px 16px", background: "var(--surface2)", borderRadius: "14px 14px 14px 4px", border: "1px solid var(--border)", display: "flex", gap: "5px" }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--gold)", animation: "bounce 1.2s infinite", animationDelay: `${i*0.2}s` }} />)}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </>
        )}
      </div>
      {started && (
        <div style={{ padding: "12px 16px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <textarea className="input scrollbar" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Pregunta sobre perfiles, entrevistas, candidatos... (Enter para enviar)"
            rows={1} style={{ flex: 1, resize: "none", maxHeight: "100px", overflowY: "auto", fontSize: "13px" }} />
          <button className="btn-gold" onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ padding: "11px 16px", flexShrink: 0 }}>↑</button>
        </div>
      )}
    </div>
  );
}

// ─── SCREENING MODULE ─────────────────────────────────────────────────────

function ScreeningModule({ apiKey, memory, onLearn }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({ criteria: [] });
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);

  // Quick role loader
  function loadRole(role) {
    setProfile({
      jobTitle: role.title,
      area: "Tecnología",
      description: `Rol en Imaginamos para ${role.title}. Skills clave: ${role.keySkills.join(", ")}. Nice to have: ${role.niceToHave.join(", ")}. El candidato debe tener mentalidad AI First y encajar con la cultura de Imaginamos: innovación, resultados y transformación digital.`,
      criteria: role.defaultCriteria,
      modality: "Híbrido",
      salary: ""
    });
    setStep(1);
  }

  if (step === 0) return <ScreeningStep0 profile={profile} setProfile={setProfile} onNext={() => setStep(1)} onLoadRole={loadRole} />;
  if (step === 1) return <ScreeningStep1 files={files} setFiles={setFiles} onNext={() => setStep(2)} onBack={() => setStep(0)} />;
  if (step === 2) return <ScreeningStep2 files={files} profile={profile} apiKey={apiKey} memory={memory}
    onDone={(r) => { const sorted = [...r].sort((a,b) => b.totalScore - a.totalScore); setResults(sorted); onLearn(`Proceso completado: ${profile.jobTitle} — ${r.filter(x=>x.recommendation==="Avanzar").length} aptos de ${r.length} candidatos`); setStep(3); }} />;
  if (step === 3) return <ScreeningStep3 results={results} profile={profile} selected={selected} setSelected={setSelected}
    onRestart={() => { setStep(0); setProfile({ criteria: [] }); setFiles([]); setResults([]); setSelected(null); }} />;
}

function ScreeningStep0({ profile, setProfile, onNext, onLoadRole }) {
  const [criteria, setCriteria] = useState(profile.criteria?.length ? profile.criteria : [
    { name: "Experiencia relevante", weight: 25 },
    { name: "Mentalidad AI First", weight: 25 },
    { name: "Habilidades técnicas", weight: 25 },
    { name: "Fit cultural Imaginamos", weight: 15 },
    { name: "Expectativas salariales", weight: 10 },
  ]);
  const [newCrit, setNewCrit] = useState({ name: "", weight: 10 });
  const total = criteria.reduce((s,c) => s + Number(c.weight), 0);

  function update(i, field, val) {
    const u = criteria.map((c,idx) => idx===i ? {...c,[field]:field==="weight"?Number(val):val} : c);
    setCriteria(u); setProfile({...profile, criteria: u});
  }
  function add() {
    if (!newCrit.name.trim()) return;
    const u = [...criteria, {...newCrit, weight: Number(newCrit.weight)}];
    setCriteria(u); setNewCrit({name:"",weight:10}); setProfile({...profile, criteria: u});
  }
  function remove(i) { const u = criteria.filter((_,idx)=>idx!==i); setCriteria(u); setProfile({...profile, criteria: u}); }

  return (
    <div className="fade-up scrollbar" style={{ overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Quick roles */}
      <div className="card" style={{ padding: "20px" }}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>⚡ Cargos frecuentes de Imaginamos</div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {IMAGINAMOS_DNA.frequentRoles.map((r, i) => (
            <button key={i} className="btn-ghost" onClick={() => onLoadRole(r)} style={{ fontSize: "12px", padding: "8px 16px" }}>
              {r.title} →
            </button>
          ))}
        </div>
      </div>

      {/* Job info */}
      <div className="card" style={{ padding: "20px" }}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "14px" }}>📌 Perfil del cargo</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--ink3)", display: "block", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Nombre del cargo *</label>
            <input className="input" placeholder="ej. Product Manager" value={profile.jobTitle||""} onChange={e=>setProfile({...profile,jobTitle:e.target.value})} />
          </div>
          <div>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--ink3)", display: "block", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Área</label>
            <input className="input" placeholder="ej. Tecnología" value={profile.area||""} onChange={e=>setProfile({...profile,area:e.target.value})} />
          </div>
          <div>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--ink3)", display: "block", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Modalidad</label>
            <select className="input" value={profile.modality||""} onChange={e=>setProfile({...profile,modality:e.target.value})}>
              <option value="">Seleccionar...</option><option>Presencial</option><option>Remoto</option><option>Híbrido</option>
            </select>
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--ink3)", display: "block", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Descripción y requisitos *</label>
            <textarea className="input" rows={4} placeholder="Describe el rol, responsabilidades y lo que buscas específicamente en Imaginamos..." value={profile.description||""} onChange={e=>setProfile({...profile,description:e.target.value})} style={{resize:"vertical"}} />
          </div>
        </div>
      </div>

      {/* Criteria */}
      <div className="card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "1px" }}>⚖️ Criterios de evaluación</div>
          <span style={{ fontSize: "12px", fontWeight: "700", color: total===100 ? "var(--green)" : "var(--red)" }}>{total}% {total===100?"✓":`(faltan ${100-total}%)`}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
          {criteria.map((c,i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "var(--surface2)", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <span style={{ flex: 1, fontSize: "13px", color: "var(--ink)", fontWeight: "600" }}>{c.name}</span>
              <input type="range" min="5" max="50" value={c.weight} onChange={e=>update(i,"weight",e.target.value)} style={{ width: "80px", accentColor: "var(--gold)" }} />
              <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--gold)", width: "32px" }}>{c.weight}%</span>
              <button onClick={()=>remove(i)} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--ink3)",fontSize:"16px" }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input className="input" placeholder="Nuevo criterio..." value={newCrit.name} onChange={e=>setNewCrit({...newCrit,name:e.target.value})} onKeyDown={e=>e.key==="Enter"&&add()} style={{flex:1}} />
          <input type="number" className="input" value={newCrit.weight} onChange={e=>setNewCrit({...newCrit,weight:e.target.value})} style={{width:"70px"}} />
          <button className="btn-ghost" onClick={add} style={{fontSize:"12px"}}>+ Agregar</button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn-gold" onClick={onNext} disabled={!profile.jobTitle||!profile.description||total!==100}>
          Continuar → Subir HVs
        </button>
      </div>
    </div>
  );
}

function ScreeningStep1({ files, setFiles, onNext, onBack }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();
  const handleFiles = (f) => {
    const pdfs = Array.from(f).filter(x => x.name.endsWith(".pdf"));
    setFiles(prev => { const names = new Set(prev.map(f=>f.name)); return [...prev, ...pdfs.filter(f=>!names.has(f.name))]; });
  };
  return (
    <div className="fade-up scrollbar" style={{ overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div className="card" style={{ padding: "20px" }}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>📂 Carga las hojas de vida (PDF)</div>
        <div className={`drop-zone ${dragging?"dragover":""}`}
          onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);handleFiles(e.dataTransfer.files);}}
          onClick={()=>inputRef.current.click()}>
          <div style={{fontSize:"32px",marginBottom:"10px"}}>📄</div>
          <div style={{fontWeight:"700",color:"var(--ink)",fontSize:"14px",marginBottom:"4px"}}>Arrastra los PDFs aquí</div>
          <div style={{fontSize:"12px",color:"var(--ink3)"}}>o haz clic para seleccionar · hasta 50 archivos</div>
          <input ref={inputRef} type="file" accept=".pdf" multiple hidden onChange={e=>handleFiles(e.target.files)} />
        </div>
        {files.length > 0 && (
          <div style={{marginTop:"16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"10px"}}>
              <span style={{fontSize:"13px",fontWeight:"700",color:"var(--ink)"}}>{files.length} archivo{files.length>1?"s":""}</span>
              <button className="btn-ghost" style={{fontSize:"11px",padding:"4px 10px"}} onClick={()=>setFiles([])}>Limpiar</button>
            </div>
            <div className="scrollbar" style={{maxHeight:"220px",overflowY:"auto",display:"flex",flexDirection:"column",gap:"6px"}}>
              {files.map((f,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 12px",background:"var(--surface2)",borderRadius:"8px",border:"1px solid var(--border)"}}>
                  <span style={{fontSize:"16px"}}>📄</span>
                  <span style={{flex:1,fontSize:"12px",color:"var(--ink)",fontWeight:"500"}}>{f.name}</span>
                  <span style={{fontSize:"11px",color:"var(--ink3)"}}>{(f.size/1024).toFixed(0)}KB</span>
                  <button onClick={()=>setFiles(prev=>prev.filter((_,idx)=>idx!==i))} style={{background:"none",border:"none",cursor:"pointer",color:"var(--ink3)"}}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div style={{display:"flex",justifyContent:"space-between"}}>
        <button className="btn-ghost" onClick={onBack}>← Volver</button>
        <button className="btn-gold" onClick={onNext} disabled={files.length===0}>Analizar {files.length>0?`${files.length} HV${files.length>1?"s":""}`:""} →</button>
      </div>
    </div>
  );
}

function ScreeningStep2({ files, profile, apiKey, memory, onDone }) {
  const [results, setResults] = useState([]);
  const [current, setCurrent] = useState(0);
  const [status, setStatus] = useState("idle");
  const ran = useRef(false);

  const analyze = useCallback(async () => {
    if (ran.current) return; ran.current = true; setStatus("running");
    const criteriaText = profile.criteria.map(c=>`- ${c.name} (peso: ${c.weight}%)`).join("\n");
    const processed = [];
    for (let i=0;i<files.length;i++) {
      setCurrent(i+1);
      try {
        const base64 = await readFileAsBase64(files[i]);
        const prompt = `Analiza esta hoja de vida para IMAGINAMOS.

CARGO: ${profile.jobTitle} | ÁREA: ${profile.area||"N/A"} | MODALIDAD: ${profile.modality||"N/A"}
DESCRIPCIÓN: ${profile.description}
CRITERIOS: ${criteriaText}
ADN IMAGINAMOS: Valores: ${IMAGINAMOS_DNA.values.join(", ")}. Must have: ${IMAGINAMOS_DNA.mustHave.join(" | ")}. Red flags: ${IMAGINAMOS_DNA.redFlags.join(" | ")}
${memory.length>0?`APRENDIZAJES PREVIOS: ${memory.slice(-3).join(" | ")}`:""}

Responde SOLO con JSON válido sin backticks:
{"name":"Nombre completo","currentRole":"Cargo actual","experience":"X años","education":"Título más relevante","totalScore":<1-10>,"recommendation":"Avanzar"|"En espera"|"Descartar","aiFirstScore":<1-10>,"cultureFitScore":<1-10>,"scores":[${profile.criteria.map(c=>`{"criterio":"${c.name}","puntaje":<1-10>,"comentario":"breve"}`).join(",")}],"strengths":["s1","s2","s3"],"alerts":["a1","a2"],"summary":"2-3 oraciones sobre el fit con Imaginamos"}`;

        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method:"POST", headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01"},
          body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:[{type:"document",source:{type:"base64",media_type:"application/pdf",data:base64}},{type:"text",text:prompt}]}]})
        });
        const data = await res.json();
        const raw = data.content?.map(b=>b.text||"").join("").trim();
        const parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());
        processed.push({...parsed,fileName:files[i].name});
      } catch {
        processed.push({name:files[i].name.replace(".pdf",""),fileName:files[i].name,totalScore:0,recommendation:"Error",scores:[],strengths:[],alerts:["Error al procesar"],summary:"No se pudo analizar."});
      }
      setResults([...processed]);
    }
    processed.sort((a,b)=>b.totalScore-a.totalScore);
    setResults(processed); setStatus("done"); onDone(processed);
  }, [files, profile, apiKey, memory, onDone]);

  if (status==="idle") return (
    <div className="fade-up card" style={{padding:"50px 30px",textAlign:"center",margin:"20px"}}>
      <div style={{fontSize:"48px",marginBottom:"16px"}}>👁️</div>
      <h3 style={{fontFamily:"'Cinzel'",fontSize:"20px",color:"var(--gold)",marginBottom:"10px",letterSpacing:"2px"}}>ELROI VE CADA PERFIL</h3>
      <p style={{color:"var(--ink2)",marginBottom:"28px",lineHeight:"1.7",fontSize:"13px"}}>
        <strong style={{color:"var(--ink)"}}>{files.length} hojas de vida</strong> serán analizadas con el ADN de Imaginamos<br/>
        para el cargo <strong style={{color:"var(--gold)"}}>{profile.jobTitle}</strong>
      </p>
      <button className="btn-gold" style={{fontSize:"15px",padding:"13px 36px"}} onClick={analyze}>⚡ Iniciar análisis</button>
    </div>
  );

  const pct = Math.round((current/files.length)*100);
  return (
    <div className="fade-up card" style={{padding:"32px",margin:"20px"}}>
      <div style={{textAlign:"center",marginBottom:"24px"}}>
        <div style={{fontSize:"40px",marginBottom:"12px",display:"inline-block",animation:status==="running"?"spin 3s linear infinite":"none"}}>👁️</div>
        <h3 style={{fontFamily:"'Cinzel'",fontSize:"18px",color:"var(--gold)",marginBottom:"6px",letterSpacing:"1px"}}>
          {status==="running"?`Analizando ${current} de ${files.length}...`:"¡Análisis completado!"}
        </h3>
        {status==="running"&&<p style={{color:"var(--ink3)",fontSize:"12px",animation:"pulse 1.5s infinite"}}>{files[current-1]?.name}</p>}
      </div>
      <div style={{background:"var(--surface2)",borderRadius:"6px",height:"5px",overflow:"hidden",marginBottom:"14px"}}>
        <div style={{height:"100%",background:"linear-gradient(90deg,var(--gold),var(--gold2))",width:`${pct}%`,transition:"width 0.5s ease",borderRadius:"6px"}} />
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:"12px",color:"var(--ink3)",marginBottom:"20px"}}>
        <span>{pct}%</span><span>{current}/{files.length}</span>
      </div>
      {results.slice(-3).map((r,i)=>(
        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"var(--surface2)",borderRadius:"8px",fontSize:"12px",marginBottom:"6px",border:"1px solid var(--border)"}}>
          <span style={{fontWeight:"700",color:"var(--ink)"}}>{r.name}</span>
          <span className={`tag tag-${r.recommendation==="Avanzar"?"green":r.recommendation==="En espera"?"yellow":"red"}`}>{r.recommendation}</span>
        </div>
      ))}
    </div>
  );
}

function ScreeningStep3({ results, profile, selected, setSelected, onRestart }) {
  const avanzar = results.filter(r=>r.recommendation==="Avanzar");
  const espera = results.filter(r=>r.recommendation==="En espera");
  const descartar = results.filter(r=>r.recommendation==="Descartar");

  function ScoreBar({value}) {
    const pct=(value/10)*100;
    const color=pct>=70?"var(--green)":pct>=50?"var(--yellow)":"var(--red)";
    return <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
      <div style={{flex:1,height:"4px",background:"var(--surface2)",borderRadius:"4px",overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:"4px"}} />
      </div>
      <span style={{fontSize:"12px",fontWeight:"700",color,width:"24px"}}>{value}</span>
    </div>;
  }

  function Card({c, rank}) {
    const isSelected = selected?.fileName===c.fileName;
    const tagClass = c.recommendation==="Avanzar"?"tag-green":c.recommendation==="En espera"?"tag-yellow":"tag-red";
    return (
      <div onClick={()=>setSelected(isSelected?null:c)} style={{padding:"14px 18px",background:isSelected?"rgba(201,168,76,0.05)":"var(--surface)",border:`1.5px solid ${isSelected?"var(--gold)":"var(--border)"}`,borderRadius:"12px",cursor:"pointer",transition:"all 0.2s",marginBottom:"8px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <div style={{width:"30px",height:"30px",borderRadius:"50%",background:rank<=3?"linear-gradient(135deg,var(--gold),var(--gold2))":"var(--surface2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:rank<=3?"14px":"12px",fontWeight:"700",color:rank<=3?"#0a0806":"var(--ink3)",flexShrink:0}}>
            {rank<=3?["🥇","🥈","🥉"][rank-1]:rank}
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:"700",fontSize:"14px",color:"var(--ink)"}}>{c.name}</div>
            <div style={{fontSize:"11px",color:"var(--ink3)"}}>{c.currentRole} · {c.experience}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            {c.aiFirstScore && <div style={{textAlign:"center",padding:"4px 8px",background:"var(--gold-light)",borderRadius:"6px"}}>
              <div style={{fontSize:"10px",color:"var(--gold)",fontWeight:"700"}}>AI First</div>
              <div style={{fontSize:"14px",fontWeight:"700",color:"var(--gold)"}}>{c.aiFirstScore}</div>
            </div>}
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"'Cinzel'",fontSize:"22px",fontWeight:"700",color:"var(--gold)"}}>{c.totalScore}</div>
              <div style={{fontSize:"10px",color:"var(--ink3)"}}>/ 10</div>
            </div>
            <span className={`tag ${tagClass}`}>{c.recommendation}</span>
          </div>
        </div>
        {isSelected && (
          <div style={{marginTop:"14px",paddingTop:"14px",borderTop:"1px solid var(--border)"}} onClick={e=>e.stopPropagation()}>
            <p style={{fontSize:"12px",color:"var(--ink2)",lineHeight:"1.7",marginBottom:"14px",fontStyle:"italic"}}>{c.summary}</p>
            {c.scores?.length>0 && <div style={{marginBottom:"14px"}}>
              {c.scores.map((s,i)=><div key={i} style={{marginBottom:"8px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
                  <span style={{fontSize:"12px",color:"var(--ink)",fontWeight:"600"}}>{s.criterio}</span>
                  <span style={{fontSize:"11px",color:"var(--ink3)"}}>{s.comentario}</span>
                </div>
                <ScoreBar value={s.puntaje} />
              </div>)}
            </div>}
            <div style={{display:"flex",gap:"16px"}}>
              {c.strengths?.length>0&&<div style={{flex:1}}>
                <div style={{fontSize:"10px",fontWeight:"700",color:"var(--green)",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>✅ Fortalezas</div>
                {c.strengths.map((s,i)=><div key={i} style={{fontSize:"12px",color:"var(--ink2)",marginBottom:"3px"}}>• {s}</div>)}
              </div>}
              {c.alerts?.length>0&&<div style={{flex:1}}>
                <div style={{fontSize:"10px",fontWeight:"700",color:"var(--red)",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>⚠️ Alertas</div>
                {c.alerts.map((a,i)=><div key={i} style={{fontSize:"12px",color:"var(--ink2)",marginBottom:"3px"}}>• {a}</div>)}
              </div>}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fade-up scrollbar" style={{overflowY:"auto",padding:"20px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"20px"}}>
        {[{l:"Analizados",v:results.length,icon:"👁️",c:"var(--gold)"},{l:"Avanzan",v:avanzar.length,icon:"✅",c:"var(--green)"},{l:"En espera",v:espera.length,icon:"⏳",c:"var(--yellow)"},{l:"Descartados",v:descartar.length,icon:"❌",c:"var(--red)"}].map((s,i)=>(
          <div key={i} className="card" style={{padding:"16px",textAlign:"center"}}>
            <div style={{fontSize:"22px",marginBottom:"6px"}}>{s.icon}</div>
            <div style={{fontFamily:"'Cinzel'",fontSize:"28px",fontWeight:"700",color:s.c}}>{s.v}</div>
            <div style={{fontSize:"11px",color:"var(--ink3)",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.5px"}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
        <div>
          <div style={{fontFamily:"'Cinzel'",fontSize:"16px",color:"var(--gold)",letterSpacing:"1px"}}>RANKING · {profile.jobTitle}</div>
          <div style={{fontSize:"11px",color:"var(--ink3)",marginTop:"2px"}}>Haz clic en cada candidato para ver el detalle</div>
        </div>
        <div style={{display:"flex",gap:"8px"}}>
          <button className="btn-ghost" style={{fontSize:"12px"}} onClick={()=>exportToCSV(results,profile.criteria,profile.jobTitle)}>⬇️ Excel</button>
          <button className="btn-gold" style={{fontSize:"12px"}} onClick={onRestart}>+ Nuevo proceso</button>
        </div>
      </div>
      {avanzar.length>0&&<><div style={{fontSize:"10px",fontWeight:"700",color:"var(--green)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px"}}>✅ Para avanzar</div>{avanzar.map((c,i)=><Card key={i} c={c} rank={results.indexOf(c)+1}/>)}</>}
      {espera.length>0&&<><div style={{fontSize:"10px",fontWeight:"700",color:"var(--yellow)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",marginTop:"16px"}}>⏳ En espera</div>{espera.map((c,i)=><Card key={i} c={c} rank={results.indexOf(c)+1}/>)}</>}
      {descartar.length>0&&<><div style={{fontSize:"10px",fontWeight:"700",color:"var(--red)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",marginTop:"16px"}}>❌ Descartados</div>{descartar.map((c,i)=><Card key={i} c={c} rank={results.indexOf(c)+1}/>)}</>}
    </div>
  );
}

// ─── MEMORY MODULE ────────────────────────────────────────────────────────

function MemoryModule({ memory, onLearn, onForget }) {
  const [newLesson, setNewLesson] = useState("");
  return (
    <div className="fade-up scrollbar" style={{ overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="card" style={{ padding: "20px" }}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>🧬 ADN IMAGINAMOS (siempre activo)</div>
        <p style={{ fontSize: "12px", color: "var(--ink3)", lineHeight: "1.6", marginBottom: "14px" }}>ELROI siempre evalúa con estos filtros base de Imaginamos:</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
          {IMAGINAMOS_DNA.mustHave.map((m,i)=><div key={i} style={{fontSize:"12px",color:"var(--green)",display:"flex",gap:"6px"}}>✅ {m}</div>)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {IMAGINAMOS_DNA.redFlags.map((r,i)=><div key={i} style={{fontSize:"12px",color:"var(--red)",display:"flex",gap:"6px"}}>🚩 {r}</div>)}
        </div>
      </div>

      <div className="card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "1px" }}>🧠 MEMORIA APRENDIDA ({memory.length})</div>
          {memory.length > 0 && <button className="btn-ghost" style={{ fontSize: "11px", padding: "4px 10px" }} onClick={onForget}>Limpiar todo</button>}
        </div>
        {memory.length === 0
          ? <p style={{ fontSize: "12px", color: "var(--ink3)", fontStyle: "italic" }}>ELROI irá aprendiendo a medida que uses el screening y el chat. Los aprendizajes aparecerán aquí.</p>
          : memory.map((m, i) => (
            <div key={i} className="memory-chip" style={{ display: "flex", justifyContent: "space-between", width: "100%", marginBottom: "6px" }}>
              <span style={{ flex: 1, fontSize: "12px" }}>{m}</span>
              <button onClick={() => onForget(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink3)", marginLeft: "8px" }}>×</button>
            </div>
          ))
        }
      </div>

      <div className="card" style={{ padding: "20px" }}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>✍️ ENSEÑAR A ELROI MANUALMENTE</div>
        <p style={{ fontSize: "12px", color: "var(--ink3)", marginBottom: "12px", lineHeight: "1.5" }}>¿Aprendiste algo en un proceso? Cuéntaselo a ELROI y lo usará en las próximas evaluaciones.</p>
        <textarea className="input" rows={3} placeholder='ej. "Los PMs que han funcionado mejor en Imaginamos vienen de startups y tienen experiencia con equipos de menos de 10 personas"' value={newLesson} onChange={e=>setNewLesson(e.target.value)} style={{resize:"vertical",marginBottom:"10px"}} />
        <button className="btn-gold" disabled={!newLesson.trim()} onClick={()=>{onLearn(newLesson.trim());setNewLesson("");}}>
          Guardar aprendizaje
        </button>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────

export default function ELROI() {
  const [unlocked, setUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [memory, setMemory] = useState([]);

  async function handleUnlock() {
    setUnlocked(true);
    try {
      const saved = await window.storage.get("elroi-memory");
      if (saved) setMemory(JSON.parse(saved.value));
    } catch {}
  }

  async function learn(insight) {
    if (memory.includes(insight)) return;
    const updated = [...memory, insight].slice(-20);
    setMemory(updated);
    try { await window.storage.set("elroi-memory", JSON.stringify(updated)); } catch {}
  }

  async function forget(indexOrAll) {
    let updated;
    if (indexOrAll === undefined) updated = [];
    else updated = memory.filter((_, i) => i !== indexOrAll);
    setMemory(updated);
    try { await window.storage.set("elroi-memory", JSON.stringify(updated)); } catch {}
  }

  if (!unlocked) return <PasswordScreen onConfirm={handleUnlock} />;

  const tabs = [
    { id: "chat", icon: "💬", label: "Consultar" },
    { id: "screening", icon: "📊", label: "Screening" },
    { id: "memory", icon: "🧠", label: `Memoria ${memory.length > 0 ? `(${memory.length})` : ""}` },
  ];

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "14px", background: "var(--surface)" }}>
          <div style={{ fontSize: "22px" }}>👁️</div>
          <div>
            <div style={{ fontFamily: "'Cinzel'", fontWeight: "900", fontSize: "18px", color: "var(--gold)", letterSpacing: "4px" }}>ELROI</div>
            <div style={{ fontSize: "10px", color: "var(--ink3)", letterSpacing: "1px" }}>אֵל רֳאִי · Imaginamos</div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: "11px", color: "var(--green)", fontWeight: "700" }}>ACTIVO</span>
          </div>
          <button className="btn-ghost" style={{ fontSize: "11px", padding: "5px 12px" }} onClick={() => setUnlocked(false)}>Salir</button>
        </div>
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--surface)", paddingLeft: "8px" }}>
          {tabs.map(t => (
            <button key={t.id} className={`tab ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {activeTab === "chat" && <ChatModule apiKey={API_KEY} memory={memory} onLearn={learn} />}
          {activeTab === "screening" && <ScreeningModule apiKey={API_KEY} memory={memory} onLearn={learn} />}
          {activeTab === "memory" && <MemoryModule memory={memory} onLearn={learn} onForget={forget} />}
        </div>
      </div>
    </>
  );
}
