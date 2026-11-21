// Scenario D: a three-week investigation (INV-1187) with real volumes:
// 4,012 alert evidence items, 600 indicators, 12 threads, a scope of 38 hosts and 61 identities,
// three changes of owner and a handoff three days ago.
import { ensureAlerts } from '../alerts.mjs';
import {
  DAY,
  HOUR,
  MIN,
  newCtx,
  actorOf,
  parseLabel,
  verdictOf,
  createRecordStep,
  addEvidenceSegments,
  commentsStep,
  scopeStep,
  claimsStep,
  tasksStep,
  proposalsStep,
  timelineStep,
  patchRecord,
  conversationsStep,
  claimHistoryActivity,
  responseLogActivity,
  changeHistoryActivity,
  postActivities,
  relatedStep,
  extraAlertInput,
  fixedAlertSpec,
  summarize,
  isAgentCode,
} from './common.mjs';
import { log } from '../client.mjs';

export const id = 'D';

const ALERT_COUNT = 4012;
const AFTER_HANDOFF_ALERTS = 312;
const TOPIC_LABEL = (topic) => topic.toLowerCase();

/* ------------------------------------------------------------------ */
/* Deterministic generators                                            */
/* ------------------------------------------------------------------ */

const rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const HOSTS = [
  ...['03', '05', '08', '09', '11', '12', '15', '16', '18', '21'].map((n) => ({ name: `finance-ws-${n}`, bu: 'Finance', role: 'Workstation', crit: 'Medium impact' })),
  ...['01', '02', '03', '04', '05', '06', '08'].map((n) => ({ name: `eng-build-${n}`, bu: 'Engineering', role: 'Build server', crit: 'High impact' })),
  ...[{ name: 'eng-ws-04', role: 'Workstation' }, { name: 'eng-ws-11', role: 'Workstation' }, { name: 'eng-git-02', role: 'Source control' }].map((h) => ({ ...h, bu: 'Engineering', crit: h.role === 'Workstation' ? 'Medium impact' : 'High impact' })),
  ...['sales-lt-03', 'sales-lt-09', 'sales-lt-14', 'sales-lt-21', 'sales-lt-22'].map((name) => ({ name, bu: 'Sales', role: 'Laptop', crit: 'Medium impact' })),
  { name: 'sales-crm-01', bu: 'Sales', role: 'CRM server', crit: 'High impact' },
  { name: 'sales-ws-02', bu: 'Sales', role: 'Workstation', crit: 'Medium impact' },
  ...['support-ws-02', 'support-ws-05', 'support-ws-07', 'support-lt-04'].map((name) => ({ name, bu: 'Support', role: name.includes('lt') ? 'Laptop' : 'Workstation', crit: 'Low impact', suspected: name.endsWith('05') || name.endsWith('07') })),
  { name: 'support-kb-02', bu: 'Support', role: 'Knowledge base', crit: 'Medium impact', suspected: true },
];

const USERS = [
  ...['k.brandt', 'l.osei', 'm.haddad', 'n.petrova', 'o.lindqvist', 'p.raman', 'r.fontaine', 's.kowalski', 't.mbeki', 'u.tanaka', 'v.ibrahim', 'w.moreau', 'y.santos', 'z.horvat'].map((name) => ({ name, bu: 'Finance' })),
  ...['c.alvarez', 'd.novak', 'e.suzuki', 'f.oduya', 'g.larsen', 'h.pereira', 'i.kaur', 'j.mwangi', 'k.dubois', 'l.fischer', 'm.rossi', 'n.ahmed'].map((name) => ({ name, bu: 'Engineering' })),
  ...['o.becker', 'p.nakamura', 'q.diallo', 'r.castro', 's.lindgren', 't.okoye', 'u.varga', 'v.reyes', 'w.kim'].map((name) => ({ name, bu: 'Sales' })),
  ...Array.from({ length: 12 }, (_, i) => ({ name: `sup.agent${String(i + 1).padStart(2, '0')}`, bu: 'Support' })),
];

const SERVICE_ACCOUNTS = ['svc-etl', 'svc-report', 'svc-deploy', 'svc-ci', 'svc-monitor', 'svc-vulnscan', 'svc-ldap-sync', 'svc-mailrelay', 'svc-crm-sync', 'svc-kb-index'];

const ALERT_RULES = [
  { name: 'Password Spraying Against Sign-in Portal', severity: 'high', risk_score: 73, weight: 38, kind: 'spray' },
  { name: 'Service Account Lateral Movement', severity: 'high', risk_score: 81, weight: 16, kind: 'host' },
  { name: 'Potential Credential Access via Windows Utilities', severity: 'high', risk_score: 73, weight: 10, kind: 'host' },
  { name: 'Privileged Login Outside Change Window', severity: 'medium', risk_score: 47, weight: 8, kind: 'host' },
  { name: 'Suspicious Inbox Rule Created', severity: 'medium', risk_score: 47, weight: 6, kind: 'user' },
  { name: 'Anomalous Token Replay', severity: 'high', risk_score: 73, weight: 6, kind: 'user' },
  { name: 'Unusual Archive Creation on File Server', severity: 'medium', risk_score: 55, weight: 4, kind: 'host' },
  { name: 'Potential Port Scan Detected', severity: 'low', risk_score: 21, weight: 12, kind: 'host' },
];
const SPRAY = ALERT_RULES[0];

const pickWeighted = (rand, rules) => {
  const total = rules.reduce((s, r) => s + r.weight, 0);
  let x = rand() * total;
  for (const r of rules) {
    x -= r.weight;
    if (x <= 0) return r;
  }
  return rules[rules.length - 1];
};

const SPRAY_SOURCES = ['198.51.100.14', '198.51.100.77', '198.51.101.9'];

/** Entity nodes for the generated part of the scope (not in the prototype's 13-node graph). */
const extraNodes = (ctx) => {
  const r = rng(11);
  const nodes = [];
  const iso = (n) => ctx.clock.iso(ctx.t(9 + (n % 8), (n * 7) % 60, 0, 0, 1 + (n % 17)));
  let n = 0;
  for (const h of HOSTS) {
    const risk = 8 + Math.floor(r() * 40);
    nodes.push({
      name: h.name,
      kind: 'host',
      status: h.suspected ? 'suspected' : 'scoped',
      crit: h.crit,
      risk,
      rl: risk >= 40 ? 'Moderate' : 'Low',
      meta: [['Type', 'Host'], ['Role', h.role], ['Owner', `${h.bu} IT`], ['Last seen', `${1 + (n % 9)} min ago`]],
      tags: [h.bu],
      ev: [],
      createdAt: iso(n++),
    });
  }
  for (const u of USERS) {
    const risk = 5 + Math.floor(r() * 35);
    nodes.push({
      name: u.name,
      kind: 'user',
      status: 'scoped',
      crit: 'Medium impact',
      risk,
      rl: risk >= 30 ? 'Moderate' : 'Low',
      meta: [['Type', 'User'], ['Department', u.bu], ['Last sign-in', `${1 + (n % 5)} days ago`]],
      tags: [u.bu],
      ev: [],
      createdAt: iso(n++),
    });
  }
  for (const name of SERVICE_ACCOUNTS) {
    const risk = 10 + Math.floor(r() * 30);
    nodes.push({
      name,
      kind: 'nhi',
      status: 'scoped',
      crit: 'High impact',
      risk,
      rl: 'Low',
      meta: [['Type', 'Non-human identity, service account'], ['Owner', 'IT Operations']],
      tags: ['Service account'],
      ev: [],
      createdAt: iso(n++),
    });
  }
  return nodes;
};

const allHostNames = (ctx) => [...ctx.d.gn.filter((g) => g.kind === 'host').map((g) => g.name), ...HOSTS.map((h) => h.name)];
const allUserNames = (ctx) => [...ctx.d.gn.filter((g) => g.kind === 'user' || g.kind === 'nhi').map((g) => g.name), ...USERS.map((u) => u.name), ...SERVICE_ACCOUNTS];

/* ------------------------------------------------------------------ */

export const run = async () => {
  const t0 = Date.now();
  const realNow = Date.now();
  const proto = newCtx('D').sc; // only for base date arithmetic
  const protoT = (h, m = 0, s = 0, ms = 0, d = 0) => Date.UTC(proto.base[0], proto.base[1], proto.base[2] + d, h, m, s, ms);
  const handoffProto = protoT(16, 5, 0, 0, 19);
  const startProto = protoT(3, 45, 0, 0, 0);
  // The prototype puts the last handoff about 1.7 days before now; the brief wants exactly 3 days. History from the
  // start of the investigation up to the handoff is compressed (about 8%) so the handoff lands three days before now
  // and day 0 stays 21 days ago. Everything after the handoff keeps the plain offset.
  const plainOffset = realNow - proto.now;
  const handoffRealTarget = realNow - 3 * DAY;
  const squeeze = (handoffRealTarget - (startProto + plainOffset)) / (handoffProto - startProto);
  const warp = (ms, offset) => {
    if (ms > handoffProto) return ms + offset;
    if (ms < startProto) return ms + offset;
    return startProto + offset + (ms - startProto) * squeeze;
  };
  const ctx = newCtx('D', { realNow, warp });
  const t = ctx.t;
  const st = ctx.d.state;
  const hw = actorOf('HW');
  const tw = actorOf('TW');
  const handoffReal = ctx.clock.ms(handoffProto);

  /* 1. Record with its three description versions */
  await createRecordStep(ctx, { createdProto: t(3, 45, 0, 0, 0), creator: hw });
  log(`  record ${ctx.sc.invId} created (${ctx.recordId}${ctx.convId ? `, conversation ${ctx.convId}` : ''}); handoff at ${new Date(handoffReal).toISOString()}`);

  /* 2. Alerts */
  const rand = rng(97);
  const hosts = allHostNames(ctx);
  const users = allUserNames(ctx);
  const alertEvidence = ctx.d.ev.filter((e) => e.det?.kind === 'alert'); // E1
  const e1Spec = fixedAlertSpec(ctx, alertEvidence[0], { host: 'signin-portal-01', user: 'a.nguyen' });
  e1Spec.sourceIp = '198.51.100.14';
  e1Spec.host = 'signin-portal-01';
  e1Spec.user = 'a.nguyen';
  const spanStart = t(3, 42, 0, 0, 0);
  const preCount = ALERT_COUNT - AFTER_HANDOFF_ALERTS;
  const fixed = [e1Spec];
  for (let i = 1; i < ALERT_COUNT; i++) {
    const post = i >= preCount;
    let tsProto;
    if (post) {
      const j = i - preCount;
      tsProto = handoffProto + 30 * MIN + ((proto.now - handoffProto - 3 * HOUR) * j) / AFTER_HANDOFF_ALERTS;
    } else if (i < 27) {
      tsProto = spanStart + (i / 27) * 90 * MIN; // the spray itself, E15 to E40
    } else {
      const u = (i - 27) / (preCount - 27);
      tsProto = spanStart + 2 * HOUR + u * (handoffProto - 2 * HOUR - spanStart);
    }
    const rule = post && rand() < 0.85 ? SPRAY : pickWeighted(rand, i < 27 ? [SPRAY] : ALERT_RULES);
    const base = { rule_name: rule.name, severity: rule.severity, risk_score: rule.risk_score, timestamp: ctx.clock.iso(tsProto + Math.floor(rand() * 1000)) };
    if (rule.kind === 'spray') {
      const target = post || i < 27 ? (post ? `sup.agent${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}` : users[Math.floor(rand() * users.length)]) : users[Math.floor(rand() * users.length)];
      fixed.push({ ...base, host: 'signin-portal-01', user: target, sourceIp: SPRAY_SOURCES[post ? 1 + Math.floor(rand() * 2) : Math.floor(rand() * 2)], reason: 'authentication event' });
    } else if (rule.kind === 'user') {
      fixed.push({ ...base, host: 'mail-gw-01', user: USERS[Math.floor(rand() * USERS.length)].name, sourceIp: '198.51.100.77', reason: 'cloud event' });
    } else {
      fixed.push({ ...base, host: hosts[Math.floor(rand() * hosts.length)], user: users[Math.floor(rand() * users.length)], sourceIp: '10.30.2.14', reason: 'process event' });
    }
  }
  const descs = await ensureAlerts({
    scenario: 'D',
    count: ALERT_COUNT,
    hosts,
    users,
    rules: ALERT_RULES.map((r) => ({ ...r, reason: 'event' })),
    start: ctx.clock.iso(spanStart),
    end: new Date(realNow).toISOString(),
    fixed,
  });
  log(`  ${descs.length} alert copies indexed`);

  /* 3. Evidence in prototype order: E1..E14, 26 alerts (E15..E40), 600 indicators (E41..E640), the other alerts */
  const e14 = ctx.d.ev.filter((e) => /^E([1-9]|1[0-4])$/.test(e.id));
  const indicators = ctx.d.ev.filter((e) => e.det?.kind === 'indicator');
  const lastNewIndex = indicators.filter((e) => e.new).length;
  const newStart = handoffProto + 45 * MIN;
  const newEnd = proto.now - 2 * HOUR;
  let newSeen = 0;
  const indicatorTime = (e, i) => {
    if (e.new) {
      const j = newSeen++;
      return newStart + ((newEnd - newStart) * j) / lastNewIndex;
    }
    return parseLabel(e.when, proto.now) + (i % 29) * 20 * MIN;
  };
  const alertEntry = (desc, actor) => ({ actor, input: extraAlertInput(desc, { createdAt: new Date(Date.parse(desc.timestamp) + 5000).toISOString() }) });
  const gap = descs.slice(1, 27).map((d) => alertEntry(d, tw));
  const rest = descs.slice(27).map((d) => alertEntry(d, tw));
  const hwTime = (e, i) => parseLabel(e.when, proto.now) + i * 4000;
  await addEvidenceSegments(
    ctx,
    [
      { proto: e14, alertFor: () => descs[0], timeOf: hwTime },
      { raw: gap },
      { proto: indicators, timeOf: indicatorTime },
      { raw: rest },
    ],
    { linkAlerts: true }
  );
  const comments = await commentsStep(ctx);
  log(`  evidence done (comments ${comments})`);

  /* 4. Scope, claims, tasks, proposals, timeline */
  const scope = await scopeStep(ctx, { actor: hw, createdAt: ctx.clock.iso(t(4, 30, 0, 0, 0)), extraNodes: extraNodes(ctx) });
  await claimsStep(ctx);
  await tasksStep(ctx, { actor: hw, createdAt: ctx.clock.iso(t(3, 50, 0, 0, 0)) });
  await proposalsStep(ctx, {
    actorCode: 'HW',
    meta: {
      p1: { createdProto: t(10, 0, 0, 0, 18) },
      p2: { createdProto: t(9, 0, 0, 0, 11), decisionProto: t(11, 30, 0, 0, 12) },
      p3: { createdProto: t(9, 30, 0, 0, 1), decisionProto: t(10, 0, 0, 0, 1) },
      p4: { createdProto: t(12, 0, 0, 0, 18), decisionProto: t(15, 12, 0, 0, 19) },
      p5: { createdProto: t(9, 30, 0, 0, 18) },
      p6: { createdProto: t(10, 0, 0, 0, 19) },
    },
  });
  await timelineStep(ctx, { actor: hw, createdAt: ctx.clock.iso(t(4, 0, 0, 0, 0)) });
  log(`  scope ${scope.entities} entities / ${scope.links} links, claims, tasks, proposals, timeline done`);

  /* 5. Owner history, description edits already done, verdict rising from 78% to 85% after the handoff */
  const mr = actorOf('MR');
  const al = actorOf('AL');
  const jt = actorOf('JT');
  const ms = (label) => ctx.clock.ms(label);
  const patches = [
    { tsMs: ms(t(9, 20, 0, 0, 0)), body: { owner: mr, actor: mr } },
    { tsMs: ms(t(9, 0, 0, 0, 6)), body: { owner: al, actor: mr, handoff_note: 'Open: how the actor moved after day 1.' } },
    { tsMs: ms(t(9, 0, 0, 0, 13)), body: { owner: jt, actor: al, handoff_note: 'Open: Engineering scope and the Support portal.' } },
    { tsMs: handoffReal, body: { owner: null, actor: jt, handoff_note: 'finance-fs-02 staging confirmed. Check the egress for the upload.' } },
    { tsMs: ms(t(15, 0, 0, 0, 12)), body: { agent_verdict: { ...verdictOf(ctx), confidence: 78, argument: { ...verdictOf(ctx).argument, confidence: 78 } }, actor: hw } },
    { tsMs: ms(t(10, 0, 0, 0, 20)), body: { agent_verdict: verdictOf(ctx), actor: hw } },
  ].sort((a, b) => a.tsMs - b.tsMs);
  for (const p of patches) await patchRecord(ctx.recordId, { ...p.body, ts: new Date(p.tsMs).toISOString() });
  log(`  owner history and verdict history applied`);

  /* 6. Conversations: 12 threads and the main conversation */
  const topics = st.msgs.map((m) => m.t.split(': ')[0]);
  const prompts = {};
  st.msgs.forEach((m, i) => {
    if (isAgentCode(m.who)) prompts[m.k] = `Check the ${TOPIC_LABEL(topics[i])} for me.`;
  });
  const dayOf = (ts) => Math.floor((ts - protoT(0, 0, 0, 0, 0)) / DAY);
  const ownerAt = (ts) => (dayOf(ts) < 6 ? 'MR' : dayOf(ts) < 13 ? 'AL' : 'JT');
  const conv = ctx.convId
    ? await conversationsStep(ctx, {
        prompts,
        prompterOf: (msg) => ownerAt(msg.ts),
        mergeThreadReplies: true,
        threadTitleOf: (key, msg) => (msg ? msg.t.split(': ')[0] : key),
      })
    : null;
  if (conv) log(`  conversation: main ${conv.main.human} human + ${conv.main.agent} agent, ${conv.threads} threads (${conv.threadMessages} messages)`);

  /* 7. Activity */
  const entries = [
    ...claimHistoryActivity(ctx),
    ...responseLogActivity(ctx, {
      skip: (l) => /^(Took ownership of the investigation|Handed the investigation to|Left the shift)/.test(l.t),
    }),
    ...changeHistoryActivity(ctx),
  ];
  await postActivities(ctx, entries);
  log(`  ${entries.length} activity entries posted`);

  /* 8. Related investigations and the final touch */
  const related = await relatedStep(ctx);
  const lastLogMs = Math.max(...st.log.map((l) => ctx.clock.ms(l.ts)));
  await patchRecord(ctx.recordId, { priority_note: ctx.clock.text(ctx.sc.priority.note), actor: hw, ts: new Date(lastLogMs).toISOString() });

  return { ctx, result: { ms: Date.now() - t0 }, summary: await summarize(ctx, { related: related.length }) };
};
