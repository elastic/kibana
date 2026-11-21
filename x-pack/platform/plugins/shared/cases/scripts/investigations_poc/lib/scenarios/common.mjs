// Shared builders and steps for the investigation scenario seeds.
//
// The prototype data comes from prototype_data.json (dumped by extract_prototype.mjs). Every step talks to the
// real investigation API (internal routes) and relies on `xpack.cases.investigations.allowBackdate: true` to
// reproduce history (created_at, ts, actor, closed_at).
import fs from 'node:fs';
import { kbn, es, log, sleep } from '../client.mjs';
import { cleanAlerts } from '../alerts.mjs';

export const DATA = JSON.parse(fs.readFileSync(new URL('./prototype_data.json', import.meta.url), 'utf8'));
export const BASE = '/internal/cases/investigations';
export const OWNER = 'securitySolution';
export const AGENT_ID = 'cases-investigation-agent';
export const MOCK_CONNECTOR = process.env.SEED_CONNECTOR ?? 'uipoc-mock-llm';
export const KIBANA_PUBLIC_URL = process.env.SEED_PUBLIC_URL ?? 'http://localhost:5602';
export const DAY = 86_400_000;
export const HOUR = 3_600_000;
export const MIN = 60_000;

/* ------------------------------------------------------------------ */
/* People                                                              */
/* ------------------------------------------------------------------ */

const WHO_MAP = {
  BW: { type: 'user', id: 'braxton.w', name: 'Braxton W.' },
  PK: { type: 'user', id: 'priya.k', name: 'Priya K.' },
  DR: { type: 'user', id: 'dana.r', name: 'Dana R.' },
  MR: { type: 'user', id: 'marcus.r', name: 'Marcus R.' },
  AL: { type: 'user', id: 'aisha.l', name: 'Aisha L.' },
  JT: { type: 'user', id: 'jun.t', name: 'Jun T.' },
  HW: { type: 'agent', id: 'hunt-worker', name: 'Hunt worker' },
  TW: { type: 'agent', id: 'triage-worker', name: 'Triage worker' },
  RA: { type: 'agent', id: 'retention-agent', name: 'Retention agent' },
  AU: { type: 'automation', id: 'workflow', name: 'Workflow' },
};
export const isAgentCode = (code) => WHO_MAP[code]?.type === 'agent';
export const isUserCode = (code) => WHO_MAP[code]?.type === 'user';
export const actorOf = (code, obo) => {
  const base = WHO_MAP[code];
  if (!base) throw new Error(`Unknown person code ${code}`);
  return obo && base.type !== 'user' ? { ...base, on_behalf_of: obo } : { ...base };
};
export const userAuth = (code) => `${WHO_MAP[code].id}:changeme`;
export const nameOf = (code) => WHO_MAP[code].name;

/* ------------------------------------------------------------------ */
/* Time                                                                */
/* ------------------------------------------------------------------ */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n, l = 2) => String(n).padStart(l, '0');

/** Prototype time `T(h, m, s, ms, d)` for a scenario base date. */
export const protoT = (sc, h, m = 0, s = 0, ms = 0, d = 0) => Date.UTC(sc.base[0], sc.base[1], sc.base[2] + d, h, m, s, ms);

const parseAbs = (text) => {
  const m = String(text).match(/^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})(?: @ (\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?)?/);
  if (!m) return null;
  return Date.UTC(Number(m[3]), MONTHS.indexOf(m[1]), Number(m[2]), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0), Number(m[7] ?? 0));
};

/** Relative label ("6 h ago", "21 days ago") or absolute prototype date to prototype ms, relative to `protoNow`. */
export const parseLabel = (label, protoNow) => {
  if (label === undefined || label === null || label === '') return protoNow;
  const l = String(label).trim();
  if (/^(just now|now)$/i.test(l)) return protoNow;
  let m = l.match(/^(\d+)\s*min ago$/);
  if (m) return protoNow - Number(m[1]) * MIN;
  m = l.match(/^(\d+)\s*h ago$/);
  if (m) return protoNow - Number(m[1]) * HOUR;
  m = l.match(/^(\d+)\s*days? ago/);
  if (m) return protoNow - Number(m[1]) * DAY;
  m = l.match(/^(\d+)\s*weeks? ago$/);
  if (m) return protoNow - Number(m[1]) * 7 * DAY;
  m = l.match(/^(\d+)\s*months? ago$/);
  if (m) return protoNow - Number(m[1]) * 30 * DAY;
  const abs = parseAbs(l);
  if (abs !== null) return abs;
  throw new Error(`Cannot parse time label "${label}"`);
};

/**
 * Maps prototype time onto real time. `anchor` pins one prototype instant to one real instant (default:
 * prototype now to the real now). `warp(protoMs, offset)` can bend the mapping (scenario D).
 */
export const makeClock = ({ protoNow, realNow = Date.now(), anchorProto = protoNow, anchorReal = realNow, warp }) => {
  const offset = anchorReal - anchorProto;
  const ms = (protoMs) => (warp ? warp(protoMs, offset) : protoMs + offset);
  const clock = {
    realNow,
    protoNow,
    offset,
    ms,
    iso: (protoMs) => new Date(ms(protoMs)).toISOString(),
    /** Label to ISO. */
    at: (label) => new Date(ms(parseLabel(label, protoNow))).toISOString(),
    labelMs: (label) => ms(parseLabel(label, protoNow)),
    /** Replaces ISO instants and "Mon D, YYYY[ @ HH:MM[:SS[.mmm]]]" dates inside a string. */
    text: (value) => {
      if (typeof value !== 'string') return value;
      return value
        .replace(/\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)\b/g, (s) => {
          const parsed = Date.parse(s);
          if (Number.isNaN(parsed)) return s;
          const iso = new Date(ms(parsed)).toISOString();
          return s.includes('.') ? iso : iso.replace(/\.\d{3}Z$/, 'Z');
        })
        .replace(/\b([A-Z][a-z]{2}) (\d{1,2}), (\d{4})(?: @ (\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?)?/g, (s, _mon, _d, _y, hh, mm, ss, mmm) => {
          const parsed = parseAbs(s);
          if (parsed === null || !MONTHS.includes(s.slice(0, 3))) return s;
          const d = new Date(ms(parsed));
          let out = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
          if (hh !== undefined) {
            out += ` @ ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
            if (ss !== undefined) out += `:${pad(d.getUTCSeconds())}`;
            if (mmm !== undefined) out += `.${pad(d.getUTCMilliseconds(), 3)}`;
          }
          return out;
        });
    },
    /** Deep copy with `text` applied to every string. */
    deep: (value) => {
      if (typeof value === 'string') return clock.text(value);
      if (Array.isArray(value)) return value.map(clock.deep);
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clock.deep(v)]));
      return value;
    },
  };
  return clock;
};

/* ------------------------------------------------------------------ */
/* API helpers                                                         */
/* ------------------------------------------------------------------ */

const chunk = (list, size) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

export const createRecordApi = async (body) => (await kbn('POST', BASE, body)).json.record;
export const getRecordApi = async (id) => (await kbn('GET', `${BASE}/${id}`)).json;
export const patchRecord = async (id, body) => (await kbn('PATCH', `${BASE}/${id}`, body)).json.record;
export const closeRecordApi = async (id, body) => (await kbn('POST', `${BASE}/${id}/_close`, body)).json.record;
export const postActivity = async (id, body) => (await kbn('POST', `${BASE}/${id}/activity`, body)).json.entry;
export const bulkUpdateItems = async (id, items, actor) => {
  const out = [];
  for (const part of chunk(items, 500)) {
    const res = (await kbn('POST', `${BASE}/${id}/items/_bulk_update`, { items: part, actor })).json;
    if (res.errors?.length) throw new Error(`bulk_update errors: ${JSON.stringify(res.errors.slice(0, 3))}`);
    out.push(...res.items);
  }
  return out;
};

/** Creates items in order (max 1000 per request). Returns the created items in input order. */
export const bulkCreate = async (recordId, inputs, actor, opts = {}) => {
  const created = [];
  for (const part of chunk(inputs, 1000)) {
    const body = { items: part, actor, extract_indicators: false, link_alerts: opts.linkAlerts ?? false };
    let res;
    try {
      res = (await kbn('POST', `${BASE}/${recordId}/items/_bulk_create`, body)).json;
    } catch (e) {
      e.message += `\n  (first item of the request: ${JSON.stringify(part[0]).slice(0, 500)})`;
      throw e;
    }
    if (res.errors?.length) {
      throw new Error(`bulk_create reported errors: ${JSON.stringify(res.errors.slice(0, 3))} for item ${JSON.stringify(part[res.errors[0].index]).slice(0, 400)}`);
    }
    created.push(...res.items);
  }
  return created;
};

/** Groups consecutive entries with the same actor id into runs, keeping the overall order (ref allocation). */
export const runsByActor = (entries) => {
  const runs = [];
  for (const entry of entries) {
    const last = runs[runs.length - 1];
    if (last && last.actor.id === entry.actor.id && (last.actor.on_behalf_of ?? null) === (entry.actor.on_behalf_of ?? null)) last.entries.push(entry);
    else runs.push({ actor: entry.actor, entries: [entry] });
  }
  return runs;
};

/** Bulk creates entries ({ actor, input }) in order, run by run; returns created items in entry order. */
export const createOrdered = async (recordId, entries, opts = {}) => {
  const out = [];
  for (const run of runsByActor(entries)) {
    out.push(...(await bulkCreate(recordId, run.entries.map((e) => e.input), run.actor, opts)));
  }
  return out;
};

/* ------------------------------------------------------------------ */
/* Conversations                                                       */
/* ------------------------------------------------------------------ */

export const converseHuman = async (conversationId, who, text) => {
  await kbn(
    'POST',
    '/api/chat/converse',
    { agent_id: AGENT_ID, conversation_id: conversationId, input: text, trigger_mode: 'never' },
    { public: true, auth: userAuth(who) }
  );
};

export const converseAgent = async (conversationId, who, prompt) => {
  // `/api/agent_builder/converse` rejects `trigger_mode`; it always executes the agent.
  const res = await kbn(
    'POST',
    '/api/agent_builder/converse',
    { agent_id: AGENT_ID, conversation_id: conversationId, input: prompt, connector_id: MOCK_CONNECTOR },
    { public: true, auth: userAuth(who) }
  );
  return res.json?.response?.message ?? '';
};

export const replyRegistry = new Map();
export const registerReply = (prompt, reply, tool) => {
  if (replyRegistry.has(prompt) && replyRegistry.get(prompt).reply !== reply) throw new Error(`Duplicate seed prompt with a different reply: ${prompt}`);
  replyRegistry.set(prompt, tool ? { reply, tool } : { reply });
};

export const mismatchedReplies = [];
/** Set by seed.mjs after a preflight against the mock model; when off, only human messages are seeded. */
export const agentRounds = { enabled: true, skipped: 0, reason: '' };

/**
 * Seeds a list of conversation messages as real rounds. `messages`: [{ who, text, prompt? }] in time order.
 * Human messages are appended without running the agent. Agent messages run the mock model with a short prompt whose
 * canned reply (seed_replies.json) is the prototype text. `mergeReplies` turns a human message directly before an
 * agent reply into that reply's prompt.
 */
export const seedMessages = async (conversationId, messages, { prompter, mergeReplies = false, label = '' }) => {
  const queue = [...messages];
  let counts = { human: 0, agent: 0 };
  while (queue.length) {
    const msg = queue.shift();
    if (isUserCode(msg.who)) {
      const next = queue[0];
      const merge = mergeReplies && next && isAgentCode(next.who);
      if (merge) registerReply(msg.text, next.text, next.tool);
      if (merge && agentRounds.enabled) {
        queue.shift();
        const reply = await converseAgent(conversationId, msg.who, msg.text);
        counts.agent += 1;
        if (reply !== next.text) mismatchedReplies.push({ label, prompt: msg.text, got: reply.slice(0, 120) });
        continue;
      }
      if (merge) {
        queue.shift();
        agentRounds.skipped += 1;
      }
      await converseHuman(conversationId, msg.who, msg.text);
      counts.human += 1;
      continue;
    }
    const prompt = msg.prompt ?? `Please continue the investigation (${label} ${counts.agent + counts.human + agentRounds.skipped + 1}).`;
    registerReply(prompt, msg.text, msg.tool);
    if (!agentRounds.enabled) {
      agentRounds.skipped += 1;
      continue;
    }
    const reply = await converseAgent(conversationId, typeof prompter === 'function' ? prompter(msg) : prompter, prompt);
    counts.agent += 1;
    if (reply !== msg.text) mismatchedReplies.push({ label, prompt, got: reply.slice(0, 120) });
  }
  return counts;
};

/* ------------------------------------------------------------------ */
/* Conversions from the prototype shapes                               */
/* ------------------------------------------------------------------ */

const EVIDENCE_TYPE = {
  Alert: 'alert',
  Event: 'event',
  Entity: 'entity',
  Indicator: 'indicator',
  Query: 'query',
  'Saved search': 'saved_search',
  Visualization: 'visualization',
  File: 'file',
  Note: 'note',
  Check: 'finding',
  Conversation: 'conversation',
};
const INDICATOR_TYPE = {
  'IP address': 'ip',
  Domain: 'domain',
  URL: 'url',
  'File hash': 'file_hash',
  'File path': 'file_path',
  'Email address': 'email',
  'Registry key': 'registry_key',
};
const SOURCE_KIND = {
  alert: 'alert',
  event: 'document',
  entity: 'entity',
  indicator: 'document',
  query: 'query',
  saved_search: 'saved_search',
  visualization: 'visualization',
  file: 'file',
  note: 'manual',
  finding: 'manual',
  conversation: 'conversation',
};
const LINK_KIND = { own: 'ownership', net: 'network', auth: 'authentication', lat: 'lateral_movement', exec: 'execution' };
const CLASSIFICATION = { Inconclusive: 'inconclusive', Benign: 'benign', 'True positive': 'true_positive' };
const VERDICT_ENUM = { Benign: 'benign', 'True positive': 'true_positive', Inconclusive: 'inconclusive' };
export const classificationOf = (cls) => CLASSIFICATION[cls] ?? 'inconclusive';
export const verdictEnumOf = (v) => VERDICT_ENUM[v] ?? 'inconclusive';

const mimeOf = (name) => {
  const ext = String(name).split('.').pop()?.toLowerCase();
  return { pdf: 'application/pdf', csv: 'text/csv', eml: 'message/rfc822', png: 'image/png', txt: 'text/plain', json: 'application/json' }[ext];
};

export const argumentOf = (ctx, a, fallbackIso) => {
  if (!a) return null;
  let when;
  try {
    when = ctx.clock.at(a.when);
  } catch {
    when = fallbackIso ?? new Date(ctx.clock.realNow).toISOString();
  }
  return {
    kind: a.kind,
    by: a.by,
    when,
    strength: a.strength,
    confidence: a.pct ?? null,
    claim: a.claim,
    condition: a.cond ?? '',
    grounds: (a.grounds ?? []).map((g) => ({ text: g.t, evidence: g.ev ?? [], source: g.src ?? '', weight: g.w })),
    steps: (a.steps ?? []).map((s) =>
      s.gap
        ? { text: s.t, evidence: s.ev ?? [], source: '', so: s.why ?? '', gap: true, why: s.why ?? '' }
        : { text: s.t, evidence: s.ev ?? [], source: s.src ?? '', so: s.so ?? '' }
    ),
    warrant: a.warrant ? { rule: a.warrant.rule, backing: a.warrant.backing } : null,
    rebuttals: (a.rebuttals ?? []).map((r) => ({ text: r.t, status: r.status, response: r.resp ?? '', evidence: r.ev ?? [] })),
    against: (a.against ?? []).map((x) => ({ text: x.t, evidence: x.ev ?? [], weight: x.w })),
    gaps: (a.gaps ?? []).map((x) => ({ text: x.t, why: x.why ?? '', evidence: x.ev ?? [], weight: x.w })),
    changes: a.changes ?? '',
  };
};

export const verdictOf = (ctx) => {
  const v = ctx.sc.verdict;
  if (!v) return null;
  return {
    label: v.v,
    confidence: v.pct,
    classification: classificationOf(v.cls),
    alternatives: v.alts.map((x) => ({ badge: x.badge, headline: x.h, text: x.t, evidence: x.ev })),
    argument: argumentOf(ctx, ctx.d.arg.V),
  };
};

const fieldValue = (pairs, key) => pairs?.find((p) => p[0] === key)?.[1];

/** Snapshot of an evidence item from its prototype detail. */
export const snapshotOf = (ctx, e) => {
  const det = e.det;
  const c = ctx.clock;
  if (!det) return { kind: 'finding', text: c.text(e.d), steps: [] };
  switch (det.kind) {
    case 'alert':
      return {
        kind: 'alert',
        severity: det.sev,
        risk_score: det.risk,
        timestamp: c.iso(parseLabel(det.ts, ctx.sc.now)),
        rule: det.rule,
        description: det.desc,
        reason: det.reason,
        mitre: det.mitre,
        fields: c.deep(det.fields),
      };
    case 'entity': {
      const node = det.node && typeof det.node === 'object' ? det.node : ctx.d.gn.find((n) => n.id === det.node);
      return { kind: 'entity', attributes: c.deep(node?.meta ?? []), ...(det.contrib ? { contributions: det.contrib } : {}) };
    }
    case 'indicator':
      return { kind: 'indicator', facts: c.deep(det.facts), intel: det.intel, seen: det.seen };
    case 'query':
      return { kind: 'query', query: c.text(det.q), columns: det.cols, rows: det.rows, meta: det.meta, ...(det.note ? { note: det.note } : {}) };
    case 'finding':
      return { kind: 'finding', text: det.text, steps: det.steps };
    case 'event':
      return {
        kind: 'event',
        category: det.cat,
        timestamp: c.iso(parseLabel(det.ts, ctx.sc.now)),
        fields: c.deep(det.fields),
        ...(det.tree ? { tree: det.tree } : {}),
      };
    case 'file':
      return { kind: 'file', name: det.name, size: det.size, sha256: det.sha, ...(mimeOf(det.name) ? { mime_type: mimeOf(det.name) } : {}) };
    case 'note':
      return { kind: 'note', text: det.text };
    case 'saved':
      return { kind: 'saved_search', name: det.name, summary: det.summary, columns: det.cols, rows: det.rows };
    case 'viz':
      return { kind: 'visualization', name: det.name, app: 'Lens' };
    case 'conversation':
      return { kind: 'conversation', conversation_id: ctx.convId ?? 'n/a', message: e.d, author: nameOf(e.by) };
    default:
      return { kind: 'note', text: e.d };
  }
};

/** Evidence item input from a prototype evidence entry. `alert` is the alert descriptor for alert evidence. */
export const evidenceInput = (ctx, e, { createdAt, alert } = {}) => {
  const type = EVIDENCE_TYPE[e.type];
  const det = e.det;
  const evidence = {
    type,
    why: e.why ? ctx.clock.text(e.why) : null,
    source: { label: e.src, kind: SOURCE_KIND[type] },
    snapshot: snapshotOf(ctx, e),
  };
  if (type === 'indicator') {
    const value = det?.value ?? e.title;
    evidence.indicator = { type: INDICATOR_TYPE[det?.itype ?? e.itype] ?? 'other', value };
  }
  if (type === 'alert' && alert) {
    evidence.source = { label: e.src, kind: 'alert', index: alert.index, id: alert.id };
    evidence.alert = { id: alert.id, index: alert.index, rule_id: alert.rule_id, rule_name: alert.rule_name, severity: alert.severity, risk_score: alert.risk_score, host: alert.host, user: alert.user, timestamp: alert.timestamp };
  }
  if (type === 'conversation' && ctx.convId) evidence.source.conversation_id = ctx.convId;
  if (e.integ) evidence.integrity_note = ctx.clock.text(e.integ);
  if (e.expired) evidence.source_expired = true;
  return {
    kind: 'evidence',
    title: ctx.clock.text(e.title).slice(0, 500),
    text: e.d && e.d !== e.title ? ctx.clock.text(e.d) : null,
    evidence,
    created_at: createdAt,
  };
};

/** Alert evidence input for an alert copy that has no prototype evidence entry of its own. */
export const extraAlertInput = (desc, { createdAt, label = 'Alerts index', why = null, snapshot = null } = {}) => ({
  kind: 'evidence',
  title: desc.rule_name,
  evidence: {
    type: 'alert',
    why,
    source: { label, kind: 'alert', index: desc.index, id: desc.id },
    alert: {
      id: desc.id,
      index: desc.index,
      rule_id: desc.rule_id,
      rule_name: desc.rule_name,
      severity: desc.severity,
      risk_score: desc.risk_score,
      host: desc.host,
      user: desc.user,
      timestamp: desc.timestamp,
    },
    ...(snapshot ? { snapshot } : {}),
  },
  created_at: createdAt,
});

/** Alert descriptor spec (for ensureAlerts `fixed`) from an alert evidence entry. */
export const fixedAlertSpec = (ctx, e, defaults = {}) => {
  const det = e.det;
  return {
    rule_name: det.rule,
    severity: det.sev,
    risk_score: det.risk,
    timestamp: ctx.clock.iso(parseLabel(det.ts, ctx.sc.now)),
    reason: det.reason,
    description: det.desc,
    host: fieldValue(det.fields, 'host.name') ?? defaults.host,
    user: fieldValue(det.fields, 'user.name') ?? defaults.user,
    process: fieldValue(det.fields, 'process.name'),
    sourceIp: fieldValue(det.fields, 'source.ip'),
    destinationIp: fieldValue(det.fields, 'destination.ip'),
  };
};

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

export const newCtx = (id, clockOptions = {}) => {
  const d = DATA.scenarios[id];
  const sc = d.sc;
  const clock = makeClock({ protoNow: sc.now, ...clockOptions });
  return {
    id,
    d,
    sc,
    clock,
    t: (h, m, s, ms, day) => protoT(sc, h, m, s, ms, day),
    obo: sc.obo ?? null,
    recordId: null,
    record: null,
    convId: null,
    evId: {}, // E1 -> item id
    evRefToId: {},
    claimId: {},
    taskId: {},
    propId: {},
    nodeId: {},
    edgeId: {},
    threadConv: {},
    claimItems: {},
    entityByName: {},
    stats: { relatedCreated: 0 },
    agentActor: (code) => actorOf(code, sc.obo ?? null),
    actor: (code) => actorOf(code, sc.obo ?? null),
  };
};

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

export const recordFields = (ctx) => {
  const f = ctx.d.state.fields;
  return {
    business_unit_keyword: f.unit,
    impact_keyword: f.impact,
    data_classification_keyword: f.cls,
    ticket_keyword: f.ticket || null,
    ...(ctx.sc.tag ? { flag_keyword: ctx.sc.tag } : {}),
  };
};

/**
 * Description versions from the prototype change history (oldest first). The newest version is the current
 * description (`what`) so the case and the history agree.
 */
export const descriptionVersions = (ctx) => {
  const versions = ctx.sc.hist
    .filter((h) => h.what === 'Description')
    .map((h) => ({ who: h.who, ts: ctx.clock.at(h.w), text: ctx.clock.text(h.t) }))
    .reverse();
  if (!versions.length) versions.push({ who: ctx.sc.parts[0], ts: null, text: ctx.sc.what });
  versions[versions.length - 1].text = ctx.clock.text(ctx.sc.what);
  return versions;
};

export const createRecordStep = async (ctx, { createdProto, creator, descriptions, tagsExtra = [] }) => {
  const sc = ctx.sc;
  const versions = descriptions ?? descriptionVersions(ctx);
  const first = versions[0];
  const createdAt = ctx.clock.iso(createdProto);
  const record = await createRecordApi({
    title: sc.title,
    description: first.text,
    summary: ctx.clock.text(sc.what),
    investigation_type: ctx.d.state.procType,
    priority: sc.priority.l.toLowerCase(),
    severity: sc.priority.l.toLowerCase(),
    tags: ['uipoc-seed', `uipoc-seed-${ctx.id}`, ...tagsExtra],
    fields: recordFields(ctx),
    origin: { type: sc.originAgent ? 'agent' : 'user', label: sc.origin, actor: creator },
    ai_enabled: sc.ai,
    create_conversation: sc.ai,
    apply_procedure: false,
    display_id: sc.invId,
    created_at: createdAt,
    actor: creator,
  });
  ctx.recordId = record.id;
  ctx.record = record;
  ctx.convId = record.conversation_id ?? null;
  if (sc.ai && !ctx.convId) {
    log(`  WARNING: ${sc.invId} has no main conversation (agent ${AGENT_ID} missing?). Run: node setup.mjs`);
  }
  // Later description versions become real description edits.
  for (const v of versions.slice(1)) {
    await patchRecord(ctx.recordId, { description: v.text, actor: actorOf(v.who, ctx.obo), ts: v.ts });
  }
  await patchRecord(ctx.recordId, { priority_note: ctx.clock.text(sc.priority.note), actor: creator, ts: ctx.clock.iso(createdProto + 1000) });
  return record;
};

/** Registers created evidence items under their prototype ids. */
const registerEvidence = (ctx, protoIds, created) => {
  created.forEach((item, i) => {
    const protoId = protoIds[i];
    if (!protoId) return;
    ctx.evId[protoId] = item.id;
    ctx.evRefToId[item.ref] = item.id;
  });
};

/**
 * Creates evidence in order. `segments`: array of
 *  - { proto: [evidence entries], alertFor(e) -> descriptor?, timeOf(e, i) -> protoMs?, actorOf(e) }
 *  - { raw: [{ actor, input, protoId? }] }
 * Consecutive entries by the same actor share a request so refs follow the prototype order.
 */
export const addEvidenceSegments = async (ctx, segments, opts = {}) => {
  const entries = [];
  for (const seg of segments) {
    if (seg.raw) {
      entries.push(...seg.raw);
      continue;
    }
    seg.proto.forEach((e, i) => {
      const protoMs = seg.timeOf ? seg.timeOf(e, i) : parseLabel(e.when, ctx.sc.now) + i * 4000;
      const input = evidenceInput(ctx, e, { createdAt: ctx.clock.iso(protoMs), alert: seg.alertFor ? seg.alertFor(e) : undefined });
      entries.push({ actor: actorOf(e.by, ctx.obo), input, protoId: e.id });
    });
  }
  const created = await createOrdered(ctx.recordId, entries, { linkAlerts: opts.linkAlerts ?? true });
  registerEvidence(ctx, entries.map((e) => e.protoId), created);
  return created;
};

/** Evidence comments (`cm`) as comment items. */
export const commentsStep = async (ctx) => {
  const cm = ctx.d.state.cm ?? {};
  const entries = [];
  for (const [protoId, list] of Object.entries(cm)) {
    const target = ctx.evId[protoId];
    if (!target) continue;
    list.forEach((c, i) => {
      entries.push({ at: ctx.clock.labelMs(c.w) + i * 1000, actor: actorOf(c.who, ctx.obo), text: ctx.clock.text(c.t), target });
    });
  }
  entries.sort((a, b) => a.at - b.at);
  const items = entries.map((e) => ({
    actor: e.actor,
    input: { kind: 'comment', text: e.text, comment: { target_id: e.target }, created_at: new Date(e.at).toISOString() },
  }));
  if (!items.length) return 0;
  await createOrdered(ctx.recordId, items);
  return items.length;
};

const entityKind = (n) => (n.kind === 'ext' ? 'external' : n.kind);

export const scopeStep = async (ctx, { actor, createdAt, extraNodes = [], linkEntityEvidence = true }) => {
  const nodes = [...ctx.d.gn, ...extraNodes];
  const entityEntries = nodes.map((n) => {
    const kind = entityKind(n);
    return {
      actor,
      input: {
        kind: 'entity',
        title: n.name,
        status: n.kind === 'ext' ? 'external' : n.status,
        entity: {
          type: kind,
          name: n.name,
          criticality: n.crit ?? null,
          risk_score: n.risk ?? null,
          risk_level: n.rl || null,
          evidence_ids: (n.ev ?? []).map((id) => ctx.evId[id]).filter(Boolean),
          attributes: ctx.clock.deep(n.meta ?? []),
          tags: n.tags ?? [],
          position: (n.pos ?? ctx.d.gpos[n.id]) ?? null,
        },
        created_at: n.createdAt ?? createdAt,
      },
      protoId: n.id,
    };
  });
  const created = await createOrdered(ctx.recordId, entityEntries);
  created.forEach((item, i) => {
    ctx.nodeId[entityEntries[i].protoId] = item.id;
    ctx.entityByName[nodes[i].name] = item.id;
  });
  const linkEntries = ctx.d.ge.map((g) => ({
    actor,
    input: {
      kind: 'link',
      title: g.label,
      status: g.status,
      link: {
        from_id: ctx.nodeId[g.a],
        to_id: ctx.nodeId[g.b],
        kind: LINK_KIND[g.kind],
        label: g.label,
        evidence_ids: (g.ev ?? []).map((id) => ctx.evId[id]).filter(Boolean),
        description: g.d ?? null,
        claim_id: null, // patched after the claims exist
      },
      created_at: createdAt,
    },
    protoId: g.id,
  }));
  const links = await createOrdered(ctx.recordId, linkEntries);
  links.forEach((item, i) => {
    ctx.edgeId[linkEntries[i].protoId] = item.id;
  });
  // Evidence that describes an entity points at it.
  const patches = [];
  for (const e of linkEntityEvidence ? ctx.d.ev : []) {
    if (e.det?.kind !== 'entity' || !ctx.evId[e.id]) continue;
    const node = e.det.node && typeof e.det.node === 'object' ? e.det.node : ctx.d.gn.find((n) => n.id === e.det.node);
    const entityId = node && ctx.entityByName[node.name];
    if (entityId) patches.push({ id: ctx.evId[e.id], patch: { evidence: { entity_id: entityId } } });
  }
  if (patches.length) await bulkUpdateItems(ctx.recordId, patches, actor);
  return { entities: created.length, links: links.length };
};

export const claimsStep = async (ctx, { createdAt } = {}) => {
  const c0 = ctx.d.state.claims;
  const entries = c0.map((c) => {
    const argKey = c.arg ?? c.id;
    const arg = ctx.d.arg[argKey];
    const status = c.status;
    const raisedLabel = c.hist?.length ? c.hist[c.hist.length - 1].w : c.when;
    return {
      actor: actorOf(c.by, ctx.obo),
      input: {
        kind: 'claim',
        title: status === 'supported' || status === 'refuted' ? c.text || c.q : c.q,
        status,
        claim: {
          question: c.q,
          conclusion: c.text || null,
          note: c.note || null,
          reasoning: c.reason ? ctx.clock.text(c.reason) : null,
          confidence: c.pct ?? null,
          needs_review: !!c.review,
          supporting_evidence_ids: (c.ev ?? []).map((id) => ctx.evId[id]).filter(Boolean),
          opposing_evidence_ids: [],
          gaps: arg ? arg.gaps.map((g) => g.t).slice(0, 50) : [],
          source_message: c.from ? { conversation_id: ctx.convId ?? 'n/a', label: c.from } : null,
          stale_reason: c.stale ?? null,
          argument: arg && c.arg ? argumentOf(ctx, arg) : null,
        },
        created_at: createdAt ?? ctx.clock.at(raisedLabel),
      },
      protoId: c.id,
      review: !!c.review,
      byAgent: isAgentCode(c.by),
    };
  });
  const created = await createOrdered(ctx.recordId, entries);
  created.forEach((item, i) => {
    ctx.claimId[entries[i].protoId] = item.id;
    ctx.claimItems[entries[i].protoId] = item;
  });
  // The server flags every agent-created claim for review; restore the prototype flag.
  const unflag = entries.map((e, i) => ({ actor: e.actor, id: created[i].id })).filter((_, i) => entries[i].byAgent && !entries[i].review);
  for (const run of runsByActor(unflag)) {
    await bulkUpdateItems(ctx.recordId, run.entries.map(({ id }) => ({ id, patch: { claim: { needs_review: false } } })), run.actor);
  }
  // Scope links that settle a claim.
  const linkPatches = ctx.d.ge.filter((g) => g.q && ctx.claimId[g.q]).map((g) => ({ id: ctx.edgeId[g.id], patch: { link: { claim_id: ctx.claimId[g.q] } } }));
  if (linkPatches.length) await bulkUpdateItems(ctx.recordId, linkPatches, entries[0].actor);
  return created.length;
};

const ownerOf = (t) => {
  switch (t.ownerT) {
    case 'agent':
      return { type: 'agent', id: t.owner ? WHO_MAP[t.owner].id : null, name: t.owner ? WHO_MAP[t.owner].name : null };
    case 'automation':
      return { type: 'automation', id: WHO_MAP.AU.id, name: WHO_MAP.AU.name };
    case 'team':
      return { type: 'team', id: t.owner, name: t.owner };
    default:
      return t.owner ? { type: 'person', id: WHO_MAP[t.owner].id, name: WHO_MAP[t.owner].name } : { type: 'person', id: null, name: null };
  }
};

export const tasksStep = async (ctx, { actor, createdAt }) => {
  const tasks = ctx.d.state.tasks;
  const entries = tasks.map((t, i) => {
    const task = {
      phase: t.phase,
      description: t.desc,
      required: !!t.required,
      owner: ownerOf(t),
      order: i + 1,
    };
    if (t.auto) {
      task.auto =
        t.auto.t === 'claim'
          ? { type: 'claim', claim_id: (t.claim && ctx.claimId[t.claim]) || null, question: t.auto.q }
          : { type: 'action', category: t.auto.cat };
    }
    if (t.status === 'done' || t.status === 'skipped') {
      task.completed_by = actorOf(t.doneBy, ctx.obo);
      task.completed_at = ctx.clock.iso(t.doneAt);
      if (t.status === 'skipped') task.skip_reason = ctx.clock.text(t.note);
      else task.note = t.note ? ctx.clock.text(t.note) : null;
    } else if (t.note) {
      task.note = ctx.clock.text(t.note);
    }
    return { actor, input: { kind: 'task', title: t.title, status: t.status, task, created_at: createdAt }, protoId: t.id };
  });
  const created = await createOrdered(ctx.recordId, entries);
  created.forEach((item, i) => {
    ctx.taskId[entries[i].protoId] = item.id;
  });
  const deps = tasks.filter((t) => t.after && ctx.taskId[t.after]).map((t) => ({ id: ctx.taskId[t.id], patch: { task: { depends_on: ctx.taskId[t.after] } } }));
  if (deps.length) await bulkUpdateItems(ctx.recordId, deps, actor);
  return created.length;
};

/**
 * Proposals. `meta[key]`: { createdProto, decisionProto? } ; the status, rejection and decision actor come from the
 * prototype state.
 */
export const proposalsStep = async (ctx, { actorCode, meta }) => {
  const st = ctx.d.state;
  const keys = Object.keys(st.propData);
  if (!keys.length) return 0;
  const entries = keys.map((key) => {
    const p = st.propData[key];
    const status = st.props[key] ?? 'pending';
    const m = meta[key] ?? meta.default;
    const dec = st.pdec?.[key];
    const rej = st.rej?.[key];
    const proposal = {
      category: p.cat,
      effect: p.eff,
      disruption: p.dis,
      confirm_label: p.confirm,
      scope: ctx.clock.deep(p.scope),
      evidence_ids: p.ev.map((id) => ctx.evId[id]).filter(Boolean),
      revision: p.ver ?? 1,
      suggestions: ctx.d.chips?.[key] ?? [],
      argument: argumentOf(ctx, ctx.d.pmap[key] && ctx.d.arg[ctx.d.pmap[key]] ? ctx.d.arg[ctx.d.pmap[key]] : ctx.d.propArgs[key], ctx.clock.iso(m.createdProto)),
    };
    if (status !== 'pending') {
      proposal.decision = {
        by: dec?.who ? actorOf(dec.who, ctx.obo) : actorOf('PK'),
        at: ctx.clock.iso(m.decisionProto ?? m.createdProto + 30 * MIN),
        reason: rej?.reason ?? null,
        note: rej?.note ?? null,
      };
    }
    return {
      actor: actorOf(actorCode, ctx.obo),
      input: { kind: 'proposal', title: p.title, status, proposal, created_at: ctx.clock.iso(m.createdProto) },
      protoId: key,
    };
  });
  const created = await createOrdered(ctx.recordId, entries);
  created.forEach((item, i) => {
    ctx.propId[entries[i].protoId] = item.id;
  });
  return created.length;
};

/** Maps a prototype link object (log, timeline) to an ActivityLink. */
export const activityLinkOf = (ctx, l) => {
  const label = (v) => (v === undefined ? null : v);
  switch (l.k) {
    case 'ev':
      return { kind: 'evidence', id: ctx.evId[l.id] ?? null, label: l.id };
    case 'node':
      return { kind: 'entity', id: ctx.nodeId[l.id] ?? null, label: ctx.d.gn.find((n) => n.id === l.id)?.name ?? l.id };
    case 'edge':
      return { kind: 'link', id: ctx.edgeId[l.id] ?? null, label: label(l.l) ?? l.id };
    case 'task':
      return { kind: 'task', id: ctx.taskId[l.id] ?? null, label: label(l.id) };
    case 'claim':
      return { kind: 'claim', id: ctx.claimId[l.id] ?? null, label: l.id };
    case 'thread':
      return { kind: 'thread', id: ctx.threadConv[l.key] ?? null, label: label(l.l) ?? 'Open thread' };
    case 'why': {
      if (l.id === 'V') return { kind: 'verdict', id: 'V', label: 'Verdict' };
      if (/^C\d+$/.test(l.id)) return { kind: 'claim', id: ctx.claimId[l.id] ?? null, label: l.id };
      if (/^P\d+$/.test(l.id)) return { kind: 'proposal', id: ctx.propId[l.id.toLowerCase()] ?? null, label: l.id };
      return { kind: 'verdict', id: l.id, label: l.id };
    }
    case 'tab':
      return { kind: 'tab', id: l.tab, label: label(l.l) };
    default:
      return { kind: 'tab', id: l.tab ?? 'overview', label: label(l.l) };
  }
};

export const timelineStep = async (ctx, { actor, createdAt }) => {
  const entries = ctx.d.sec.map((s) => ({
    actor,
    input: {
      kind: 'timeline_event',
      title: ctx.clock.text(s.title),
      text: s.d ? ctx.clock.text(s.d) : null,
      timeline_event: {
        occurred_at: ctx.clock.iso(s.ts),
        stage: s.stage,
        mitre: s.mitre || null,
        actor: { name: s.actor.n, sub: s.actor.sub ?? null, kind: s.actor.k },
        source: s.src,
        alert_severity: s.alert ?? null,
        flag: s.flag === 'suspected' ? 'suspected' : null,
        links: (s.links ?? []).map((l) => activityLinkOf(ctx, l)),
      },
      created_at: createdAt,
    },
  }));
  await createOrdered(ctx.recordId, entries);
  return entries.length;
};

/** Claim history as activity entries (oldest first). */
export const claimHistoryActivity = (ctx) => {
  const out = [];
  for (const c of ctx.d.state.claims) {
    const item = ctx.claimItems[c.id];
    [...(c.hist ?? [])].reverse().forEach((h, i) => {
      out.push({
        ts: ctx.clock.labelMs(h.w) + i * 1000,
        body: {
          message: h.t,
          action: 'claim.history',
          target: { kind: 'claim', id: item.id, ref: item.ref, title: item.title },
          links: [{ kind: 'claim', id: item.id, label: item.ref }],
          actor: actorOf(h.who, ctx.obo),
        },
      });
    });
  }
  return out;
};

/** Prototype response log as activity entries. `skip(entry)` drops entries the API already generates. */
export const responseLogActivity = (ctx, { skip = () => false, actionOf = () => 'note', extra = () => ({}) } = {}) => {
  const out = [];
  for (const l of ctx.d.state.log) {
    // "Started the investigation ..." is the record.created entry the API already writes.
    if (/^Started the investigation/.test(l.t) || skip(l)) continue;
    out.push({
      ts: ctx.clock.ms(l.ts),
      body: {
        message: l.t,
        details: l.d ?? null,
        action: actionOf(l) ?? 'note',
        actor: actorOf(l.who, l.obo ?? ctx.obo),
        links: (l.links ?? []).map((x) => activityLinkOf(ctx, x)),
        ...extra(l),
      },
    });
  }
  return out;
};

/** Change history entries for versions the API does not generate itself (claim conclusions, closing drafts). */
export const changeHistoryActivity = (ctx, { skip = () => false } = {}) => {
  const out = [];
  const hist = [...ctx.sc.hist].reverse();
  const lastByWhat = {};
  for (const h of hist) {
    const previous = lastByWhat[h.what];
    lastByWhat[h.what] = h.t;
    if (h.what === 'Description' || skip(h)) continue;
    const ts = ctx.clock.labelMs(h.w);
    if (h.what.startsWith('Conclusion ')) {
      const ref = h.what.replace('Conclusion ', '');
      const item = ctx.claimItems[ref];
      out.push({
        ts,
        body: {
          message: `Edited the conclusion of ${ref}`,
          action: 'claim.conclusion_changed',
          target: { kind: 'claim', id: item.id, ref, title: item.title },
          actor: actorOf(h.who, ctx.obo),
          before: previous ?? null,
          after: h.t,
          links: [{ kind: 'claim', id: item.id, label: ref }],
        },
      });
    } else if (h.what === 'Closing summary') {
      out.push({
        ts,
        body: {
          message: 'Drafted the closing summary',
          action: 'record.closed',
          target: { kind: 'record', id: ctx.recordId, title: ctx.sc.title },
          actor: actorOf(h.who, ctx.obo),
          before: previous ?? null,
          after: h.t,
          links: [{ kind: 'tab', id: 'overview', label: 'Outcome' }],
        },
      });
    }
  }
  return out;
};

/** Posts activity entries oldest first. */
export const postActivities = async (ctx, entries) => {
  entries.sort((a, b) => a.ts - b.ts);
  for (const e of entries) {
    await postActivity(ctx.recordId, { ...e.body, ts: new Date(e.ts).toISOString() });
  }
  return entries.length;
};

/** Verdict PATCH (agent verdict). */
export const setAgentVerdict = async (ctx, { actor, ts, override }) => {
  const verdict = { ...verdictOf(ctx), ...(override ?? {}) };
  if (override?.confidence !== undefined && verdict.argument) verdict.argument = { ...verdict.argument, confidence: override.confidence };
  await patchRecord(ctx.recordId, { agent_verdict: verdict, actor, ts });
};

/** Threads and the main conversation. Needs the prototype `msgs` and `threads`. */
export const conversationsStep = async (ctx, { prompts = {}, prompter, prompterOf, mainActor, mergeThreadReplies = true, threadTitleOf, toolFor = () => undefined }) => {
  const st = ctx.d.state;
  const label = ctx.sc.invId;
  const stats = { main: { human: 0, agent: 0 }, threads: 0, threadMessages: 0 };
  if (!ctx.convId) return stats;
  // Threads first so the log can link them.
  const keys = Object.keys(st.threads ?? {});
  for (const key of keys) {
    const msg = st.msgs.find((m) => m.k === key);
    const th = st.threads[key];
    const title = threadTitleOf ? threadTitleOf(key, msg, th) : (msg?.t ?? key).slice(0, 80);
    const res = (await kbn('POST', `${BASE}/${ctx.recordId}/threads`, { title, anchor: msg ? `Message ${msg.n}` : null })).json;
    ctx.threadConv[key] = res.thread.conversation_id;
    const messages = th.msgs.map((m, i) => ({
      who: m.who,
      ts: m.ts,
      text: m.t,
      prompt: prompts[`${key}:${i}`],
      tool: toolFor(key, i),
    }));
    const counts = await seedMessages(res.thread.conversation_id, messages, { prompter: prompterOf ?? prompter ?? th.parts.find(isUserCode) ?? 'PK', mergeReplies: mergeThreadReplies, label: `${label} thread ${key}` });
    stats.threads += 1;
    stats.threadMessages += counts.human + counts.agent;
  }
  const messages = st.msgs.map((m) => ({ who: m.who, ts: m.ts, text: m.t, prompt: prompts[m.k], tool: toolFor(m.k) }));
  stats.main = await seedMessages(ctx.convId, messages, { prompter: prompterOf ?? mainActor ?? prompter ?? 'PK', mergeReplies: false, label: `${label} main` });
  return stats;
};

/* ------------------------------------------------------------------ */
/* Related investigations (SIM / SIMD)                                 */
/* ------------------------------------------------------------------ */

const outcomeOf = (text) => {
  const m = String(text).match(/^Closed as ([a-z ]+)\. Reason: ([^.]+)\. Root cause: ([^.]+)\./i);
  if (!m) return null;
  const verdict = { benign: 'benign', 'true positive': 'true_positive', inconclusive: 'inconclusive' }[m[1].toLowerCase()] ?? 'inconclusive';
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  return { verdict, reason: cap(m[2]), root_cause: cap(m[3]) };
};

export const relatedStep = async (ctx) => {
  const created = [];
  for (const row of ctx.d.sim) {
    const detail = ctx.d.simd[row.id];
    if (!detail) continue;
    const creator = actorOf(detail.who[0]);
    const createdMs = parseLabel(detail.created, ctx.sc.now);
    const type = ctx.d.state.procType;
    const rec = await createRecordApi({
      title: row.t,
      description: ctx.clock.text(detail.summary),
      summary: ctx.clock.text(detail.summary),
      investigation_type: type,
      priority: 'medium',
      tags: ['uipoc-seed', `uipoc-seed-${ctx.id}`, 'uipoc-seed-related'],
      origin: { type: creator.type === 'agent' ? 'agent' : 'user', label: `Started by ${detail.src}`, actor: creator },
      ai_enabled: false,
      create_conversation: false,
      apply_procedure: false,
      display_id: row.id,
      created_at: ctx.clock.iso(createdMs),
      actor: creator,
    });
    const entities = detail.entities.map((name) => ({
      kind: 'entity',
      title: name,
      status: 'scoped',
      entity: { type: /^\d|\/|@|\.example$/.test(name) ? 'external' : /^svc-|^root$/.test(name) ? 'nhi' : /^edge-sec|^support-|-\d\d$|^pay-db|^srv-|^vuln/.test(name) ? 'host' : 'user', name, evidence_ids: [], attributes: [], tags: [] },
      created_at: ctx.clock.iso(createdMs + MIN),
    }));
    await bulkCreate(rec.id, entities, creator);
    const closed = /^Closed/.test(row.st) ? outcomeOf(detail.outcome) : null;
    if (closed) {
      await closeRecordApi(rec.id, {
        verdict: closed.verdict,
        reason: closed.reason,
        root_cause: closed.root_cause,
        summary: ctx.clock.text(detail.summary),
        actor: creator,
        closed_at: ctx.clock.iso(parseLabel(detail.updated, ctx.sc.now)),
      });
    } else {
      await patchRecord(rec.id, { owner: creator, actor: creator, ts: ctx.clock.iso(createdMs + 2 * MIN) });
    }
    created.push({ id: rec.id, display_id: row.id, title: row.t, status: closed ? 'closed' : 'in-progress', shared: detail.shared });
  }
  return created;
};

/* ------------------------------------------------------------------ */
/* Standard run (scenarios A, B, C, E)                                 */
/* ------------------------------------------------------------------ */

/**
 * The common order of steps. `cfg`:
 *  createdProto, creator, alerts: { spec(ctx) -> ensureAlerts args, extraEvidence(ctx, descs, e) }, evidenceTimeOf,
 *  scopeActor, scopeCreatedProto, taskCreatedProto, proposals: { actorCode, meta }, timelineActor, timelineCreatedProto,
 *  patches(ctx) -> [{ ts, body }], conversations, recordComments(ctx), skipLog, actionOf, activityExtra(ctx),
 *  beforeClose / close(ctx).
 */
export const runStandard = async (ctx, cfg, { ensureAlerts }) => {
  const sc = ctx.sc;
  const t0 = Date.now();
  await createRecordStep(ctx, { createdProto: cfg.createdProto, creator: cfg.creator });
  log(`  record ${sc.invId} created (${ctx.recordId}${ctx.convId ? `, conversation ${ctx.convId}` : ''})`);

  // Alerts and evidence.
  let descs = [];
  const alertEvidence = ctx.d.ev.filter((e) => e.det?.kind === 'alert');
  if (cfg.alerts) {
    const plan = cfg.alerts.spec(ctx);
    descs = await ensureAlerts({ scenario: ctx.id, ...plan, fixed: alertEvidence.map((e) => fixedAlertSpec(ctx, e, plan.defaults ?? {})) });
  }
  const alertByEvidence = new Map(alertEvidence.map((e, i) => [e.id, descs[i]]));
  const segments = [{ proto: ctx.d.ev, alertFor: (e) => alertByEvidence.get(e.id), timeOf: cfg.evidenceTimeOf }];
  const extraAlerts = descs.slice(alertEvidence.length);
  if (extraAlerts.length) {
    const lastMs = cfg.extraAlertsProtoMs ?? parseLabel(ctx.d.ev[ctx.d.ev.length - 1].when, sc.now);
    segments.push({
      raw: extraAlerts.map((desc, i) => ({
        actor: actorOf(cfg.extraAlertsActor ?? ctx.d.ev[0].by, ctx.obo),
        input: extraAlertInput(desc, { createdAt: ctx.clock.iso(lastMs + (i + 1) * 5000) }),
      })),
    });
  }
  await addEvidenceSegments(ctx, segments, { linkAlerts: true });
  const comments = await commentsStep(ctx);
  log(`  evidence ${ctx.d.ev.length + extraAlerts.length} (alerts ${descs.length}), comments ${comments}`);

  const scopeActor = actorOf(cfg.scopeActor, ctx.obo);
  await scopeStep(ctx, { actor: scopeActor, createdAt: ctx.clock.iso(cfg.scopeCreatedProto), linkEntityEvidence: cfg.linkEntityEvidence ?? true });
  await claimsStep(ctx);
  await tasksStep(ctx, { actor: actorOf(cfg.taskActorCode ?? cfg.scopeActor, ctx.obo), createdAt: ctx.clock.iso(cfg.taskCreatedProto) });
  if (cfg.proposals) await proposalsStep(ctx, cfg.proposals);
  await timelineStep(ctx, { actor: actorOf(cfg.timelineActor, ctx.obo), createdAt: ctx.clock.iso(cfg.timelineCreatedProto) });
  if (cfg.recordComments) await cfg.recordComments(ctx);
  log(`  scope, claims, tasks, proposals, timeline done`);

  // Record state changes in time order.
  const patches = cfg.patches ? cfg.patches(ctx) : [];
  patches.sort((a, b) => a.tsMs - b.tsMs);
  for (const p of patches) await patchRecord(ctx.recordId, { ...p.body, ts: new Date(p.tsMs).toISOString() });

  let conv = null;
  if (cfg.conversations && ctx.convId) {
    conv = await conversationsStep(ctx, cfg.conversations);
    log(`  conversation: main ${conv.main.human} human + ${conv.main.agent} agent, ${conv.threads} threads (${conv.threadMessages} messages)`);
  }

  const entries = [
    ...claimHistoryActivity(ctx),
    ...responseLogActivity(ctx, { skip: cfg.skipLog, actionOf: cfg.actionOf, extra: cfg.activityExtra }),
    ...changeHistoryActivity(ctx, { skip: cfg.skipHistory }),
  ];
  await postActivities(ctx, entries);

  const related = await relatedStep(ctx);
  if (cfg.close) await cfg.close(ctx);
  else if (cfg.finalTouch) {
    await patchRecord(ctx.recordId, { priority_note: ctx.clock.text(sc.priority.note), actor: cfg.finalTouch.actor, ts: new Date(cfg.finalTouch.tsMs).toISOString() });
  }
  return { related, conv, ms: Date.now() - t0, alerts: descs.length };
};

/* ------------------------------------------------------------------ */
/* Clean                                                               */
/* ------------------------------------------------------------------ */

const RECORDS = '.kibana-cases-investigation-records';
const ITEMS = '.kibana-cases-investigation-items';
const ACTIVITY = '.kibana-cases-investigation-activity';

/** Removes everything seeded for one scenario (records, items, activity, cases, conversations, alert copies). */
export const cleanScenario = async (id) => {
  const tag = `uipoc-seed-${id}`;
  const ids = new Set();
  const conversations = new Set();
  const recs = await es('POST', `/${RECORDS}/_search`, { size: 1000, _source: ['id', 'conversation_ids'], query: { term: { tags: tag } } }, { okStatuses: [200, 404] });
  for (const hit of recs.json?.hits?.hits ?? []) {
    ids.add(hit._source.id ?? hit._id);
    for (const c of hit._source.conversation_ids ?? []) conversations.add(c);
  }
  const cases = await kbn('GET', `/api/cases/_find?tags=${encodeURIComponent(tag)}&owner=${OWNER}&perPage=100`, undefined, { public: true, okStatuses: [200, 400] });
  for (const c of cases.json?.cases ?? []) ids.add(c.id);
  const list = [...ids];
  let removed = { records: list.length, items: 0, activity: 0, conversations: 0, alerts: 0 };
  if (list.length) {
    for (const conv of conversations) {
      const r = await kbn('DELETE', `/api/agent_builder/conversations/${conv}`, undefined, { public: true, okStatuses: [200, 204, 404, 400] }).catch(() => null);
      if (r && r.status < 300) removed.conversations += 1;
    }
    for (const part of chunk(list, 50)) {
      const filter = { terms: { record_id: part } };
      const items = await es('POST', `/${ITEMS}/_delete_by_query?refresh=true&conflicts=proceed&wait_for_completion=true`, { query: filter }, { okStatuses: [200, 404] });
      removed.items += items.json?.deleted ?? 0;
      const act = await es('POST', `/${ACTIVITY}/_delete_by_query?refresh=true&conflicts=proceed&wait_for_completion=true`, { query: filter }, { okStatuses: [200, 404] });
      removed.activity += act.json?.deleted ?? 0;
      await es('POST', `/${RECORDS}/_delete_by_query?refresh=true&conflicts=proceed`, { query: { terms: { id: part } } }, { okStatuses: [200, 404] });
      await kbn('DELETE', `/api/cases?ids=${encodeURIComponent(JSON.stringify(part))}`, undefined, { public: true, okStatuses: [200, 204, 404] });
    }
  }
  removed.alerts = await cleanAlerts(id);
  return removed;
};

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

export const summarize = async (ctx, extra = {}) => {
  const { record } = await getRecordApi(ctx.recordId);
  const c = record.counters;
  return {
    scenario: ctx.id,
    id: record.id,
    display_id: record.display_id,
    status: record.status,
    owner: record.owner?.name ?? null,
    evidence: c.evidence,
    alerts: c.alerts,
    indicators: c.indicators,
    claims: c.claims,
    tasks: `${c.tasks_done}/${c.tasks}`,
    proposals: c.proposals,
    entities: c.entities,
    links: c.links,
    timeline: c.timeline_events,
    comments: c.comments,
    activity: c.activity,
    threads: record.threads.length,
    url: `${KIBANA_PUBLIC_URL}/app/investigations/${record.id}`,
    ...extra,
  };
};

export { sleep, log };
