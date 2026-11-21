// Scripted OpenAI-compatible mock model for the investigations POC. No model tokens are spent.
//
//   node mock_llm.mjs                 # listens on MOCK_PORT (default 18555)
//   DUMP_DIR=/tmp/dump node mock_llm.mjs
//
// Introspection: GET /_captured?n=20, GET /_captured/last_raw, POST /_reset
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.MOCK_PORT ?? 18555);
const DUMP_DIR = process.env.DUMP_DIR;
const MAX_CAPTURED = 200;
if (DUMP_DIR) fs.mkdirSync(DUMP_DIR, { recursive: true });

const estTokens = (chars) => Math.ceil(chars / 4); // same heuristic as Agent Builder's estimateTokens

// ---------------------------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------------------------
const textOf = (content) => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : part?.text ?? ''))
      .join('\n');
  }
  return content == null ? '' : JSON.stringify(content);
};

const DIGEST_RE = /<investigation_digest\b[\s\S]*?<\/investigation_digest>/g;
const stripDigest = (text) => text.replace(DIGEST_RE, '').replace(/<investigation_digest\b[\s\S]*$/, '').trim();

const lastDigestLength = (messages) => {
  let len = 0;
  for (const m of messages) {
    const matches = textOf(m.content).match(DIGEST_RE);
    if (matches?.length) len = matches[matches.length - 1].length;
    else if (textOf(m.content).includes('<investigation_digest')) len = textOf(m.content).length;
  }
  return len;
};

const latestUserText = (messages) => {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return stripDigest(textOf(messages[i].content));
  }
  return '';
};

const toolNames = (body) => (body.tools ?? []).map((t) => t.function?.name ?? t.name).filter(Boolean);

// Look a tool up by suffix (Agent Builder may rename dots to underscores).
const findTool = (body, suffix) => {
  const hit = toolNames(body).find((name) => name.endsWith(suffix));
  if (!hit) {
    const err = new Error(`tool ${suffix} not offered. Offered: ${toolNames(body).join(', ')}`);
    err.code = 'TOOL_MISSING';
    throw err;
  }
  return hit;
};

const toolSuffix = (name) => {
  const hit = ['read_items', 'add_evidence', 'upsert_claim', 'set_task_status', 'upsert_entity', 'propose_action', 'update_record']
    .find((s) => String(name).endsWith(`investigation_${s}`));
  return hit ?? null;
};

// The assistant tool call that produced the trailing tool message.
const precedingCall = (messages) => {
  const last = messages[messages.length - 1];
  for (let i = messages.length - 2; i >= 0; i--) {
    const calls = messages[i].tool_calls;
    if (messages[i].role !== 'assistant' || !calls?.length) continue;
    const call = calls.find((c) => c.id === last.tool_call_id) ?? calls[calls.length - 1];
    let args = {};
    try {
      args = JSON.parse(call.function?.arguments ?? '{}');
    } catch {
      args = {};
    }
    return { name: call.function?.name ?? '', args };
  }
  return { name: '', args: {} };
};

const safeParse = (value) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

// Depth-first search for the first value stored under `key`.
const deepFind = (node, key) => {
  if (node == null || typeof node !== 'object') return undefined;
  if (!Array.isArray(node) && key in node) return node[key];
  for (const child of Array.isArray(node) ? node : Object.values(node)) {
    const hit = deepFind(child, key);
    if (hit !== undefined) return hit;
  }
  return undefined;
};

// Parse a tool message into { data, error }. Agent Builder may wrap results as { results: [{ type, data }] }.
const parseToolResult = (message) => {
  const raw = textOf(message.content);
  let parsed = safeParse(raw);
  // Agent Builder sends { response: "<tool_result>{...}</tool_result>" }.
  const inner = typeof parsed?.response === 'string' ? parsed.response.match(/<tool_result>([\s\S]*)<\/tool_result>/)?.[1] : undefined;
  if (inner !== undefined) parsed = safeParse(inner) ?? parsed;
  if (parsed === undefined) {
    return { data: undefined, error: /^\s*error\b/i.test(raw) ? raw.slice(0, 300) : undefined, raw };
  }
  const results = Array.isArray(parsed?.results) ? parsed.results : undefined;
  const errEntry = results?.find((r) => r?.type === 'error');
  if (errEntry) {
    return { data: errEntry.data, error: errEntry.data?.message ?? JSON.stringify(errEntry.data), raw };
  }
  if (parsed?.error) {
    return { data: parsed, error: typeof parsed.error === 'string' ? parsed.error : parsed.error?.message ?? JSON.stringify(parsed.error), raw };
  }
  const data = results ? results.find((r) => r?.data !== undefined)?.data ?? parsed : parsed?.data ?? parsed;
  return { data, error: undefined, raw };
};

// ---------------------------------------------------------------------------------------------
// Scripts
// ---------------------------------------------------------------------------------------------
const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/;
const SHA256 = /\b[a-f0-9]{64}\b/i;
const URL_RE = /\bhttps?:\/\/[^\s"'<>)]+/i;
const DOMAIN = /\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}\b/i;

const findIndicator = (text) => {
  const url = text.match(URL_RE)?.[0];
  if (url) return { value: url.replace(/[.,;]+$/, ''), type: 'url' };
  const hash = text.match(SHA256)?.[0];
  if (hash) return { value: hash, type: 'file_hash' };
  const ip = text.match(IPV4)?.[0];
  if (ip) return { value: ip, type: 'ip' };
  const domain = text.match(DOMAIN)?.[0];
  if (domain) return { value: domain, type: 'domain' };
  return undefined;
};

const refsOf = (text, letter) => [...new Set([...text.matchAll(new RegExp(`\\b${letter}(\\d+)\\b`, 'gi'))].map((m) => `${letter}${m[1]}`))];

const claimItemsLine = (item) => `- ${item.ref ?? item.id}: ${item.title} (${item.status})`;

// Each script: name, match(text) -> context | null, call(ctx, body) -> { suffix, args }, reply(ctx, result, call) -> string.
const SCRIPTS = [
  {
    name: 'summarise',
    match: (text) => (/summari[sz]e|unresolved|what is open/i.test(text) ? {} : null),
    call: () => ({ suffix: 'read_items', args: { kind: 'claim', status: ['open', 'blocked'] } }),
    reply: (ctx, { data }) => {
      const items = Array.isArray(data?.items) ? data.items : deepFind(data, 'items') ?? [];
      if (!items.length) return 'Nothing is unresolved: there are no open or blocked claims.';
      return [
        `There ${items.length === 1 ? 'is 1 unresolved claim' : `are ${items.length} unresolved claims`}:`,
        ...items.map(claimItemsLine),
        'Each one needs evidence before it can be settled.',
      ].join('\n');
    },
  },
  {
    name: 'add_indicator',
    match: (text) => {
      if (!/\badd\s+(an?\s+)?indicator/i.test(text)) return null;
      const indicator = findIndicator(text);
      return indicator ? { indicator } : null;
    },
    call: ({ indicator }) => ({
      suffix: 'add_evidence',
      args: {
        items: [
          {
            type: 'indicator',
            title: indicator.value,
            why: "Added at the analyst's request.",
            indicator_type: indicator.type,
            indicator_value: indicator.value,
          },
        ],
      },
    }),
    reply: ({ indicator }, { data }) => {
      const created = data?.created ?? deepFind(data, 'created') ?? [];
      const ref = created[0]?.ref ?? created[0]?.id ?? 'a new item';
      return `I added ${indicator.value} as an indicator (${ref}).`;
    },
  },
  {
    name: 'set_field',
    match: (text) => {
      const m = text.match(/\bset\s+(?:the\s+)?(?:field\s+)?([a-z0-9_]+_as_[a-z_]+)\s+to\s+["\u201c]?(.+?)["\u201d]?\s*$/is);
      return m ? { key: m[1], value: m[2].trim() } : null;
    },
    call: ({ key, value }) => ({
      suffix: 'update_record',
      args: { mode: 'set_fields', fields: [{ key, value }] },
    }),
    reply: ({ key, value }, { data }) => {
      const message = data?.message ?? deepFind(data, 'message');
      if (message) return `I could not set ${key}: ${message}`;
      return `I set ${key} to ${value}.`;
    },
  },
  {
    name: 'open_claim',
    match: (text) => {
      if (!/\bopen\s+(a\s+)?claim|raise\s+a\s+question/i.test(text)) return null;
      const afterColon = text.match(/claim\s*:\s*(.+)$/is)?.[1];
      const quoted = text.match(/claim[^"'\u201c]*["\u201c'](.+?)["\u201d']/is)?.[1];
      const question = (afterColon ?? quoted ?? 'Is the outbound destination malicious?').trim();
      return { question };
    },
    call: ({ question }) => ({
      suffix: 'upsert_claim',
      args: { question, status: 'open', note: "Raised by the agent at the analyst's request." },
    }),
    reply: ({ question }, { data }) => {
      const claim = data?.claim ?? deepFind(data, 'claim') ?? {};
      const title = String(claim.title ?? question);
      const stop = /[.?!]$/.test(title) ? '' : '.';
      return `I opened claim ${claim.ref ?? claim.id}: ${title}${stop} It needs evidence before it can be settled.`;
    },
  },
  {
    name: 'settle_claim',
    match: (text) => {
      if (!/\b(settle|support|conclude|refute|rule\s+out)/i.test(text)) return null;
      const claimRef = text.match(/\bC(\d+)\b/i);
      if (!claimRef) return null;
      const refuted = /refute|rule\s+out/i.test(text);
      const that = text.match(/\bthat\s+(.+)$/is)?.[1]?.trim();
      return {
        claimRef: `C${claimRef[1]}`,
        refuted,
        conclusion: that || 'Supported by the linked evidence.',
        evidence: refsOf(text, 'E'),
      };
    },
    call: ({ claimRef, refuted, conclusion, evidence }) => ({
      suffix: 'upsert_claim',
      args: {
        claim_ref: claimRef,
        status: refuted ? 'refuted' : 'supported',
        conclusion,
        reasoning: 'The linked evidence shows it directly.',
        confidence: 80,
        supporting_evidence_refs: evidence,
      },
    }),
    reply: ({ claimRef, refuted, evidence }, { data }) => {
      const claim = data?.claim ?? deepFind(data, 'claim') ?? {};
      const ref = claim.ref ?? claimRef;
      const linked = evidence.length ? ` and linked ${evidence.join(', ')}` : '';
      return `I marked ${ref} as ${refuted ? 'refuted' : 'supported'} at 80%${linked}. It needs your review.`;
    },
  },
  {
    name: 'mark_task_done',
    match: (text) => {
      if (!/\bmark\s+(task\s+)?T\d+\s+(as\s+)?done|\bcomplete\s+task/i.test(text) && !/\bmark\s+task\b.*\bdone/i.test(text)) return null;
      const ref = text.match(/\bT(\d+)\b/i);
      const title = text.match(/["\u201c'](.+?)["\u201d']/s)?.[1];
      if (!ref && !title) return null;
      return { taskRef: ref ? `T${ref[1]}` : undefined, taskTitle: ref ? undefined : title };
    },
    call: ({ taskRef, taskTitle }) => ({
      suffix: 'set_task_status',
      args: {
        ...(taskRef ? { task_ref: taskRef } : { task_title: taskTitle }),
        status: 'done',
        note: 'Completed by the agent.',
      },
    }),
    reply: ({ taskRef, taskTitle }, { data }) => {
      const task = data?.task ?? deepFind(data, 'task') ?? {};
      return `I marked ${task.ref ?? taskRef ?? 'the task'} done: ${task.title ?? taskTitle ?? 'task'}.`;
    },
  },
  {
    name: 'propose_action',
    match: (text) => {
      if (!/\bpropose\b|suggest\s+an\s+action|\bblock\b/i.test(text)) return null;
      const indicator = findIndicator(text);
      const evidence = refsOf(text, 'E');
      if (/isolate|contain|disable/i.test(text)) {
        const target = text.match(/\b(?:isolate|contain|disable)\s+(?:the\s+)?(?:host\s+|user\s+|account\s+)?([\w.@-]+)/i)?.[1];
        const name = target && !/^(it|them|this|that)$/i.test(target) ? target : indicator?.value ?? 'the affected host';
        return {
          category: 'Contain',
          title: `Contain ${name}`,
          effect: 'Cuts the target off from the network until released. Reversible.',
          evidence,
        };
      }
      if (/capture|collect/i.test(text)) {
        return {
          category: 'Collect evidence',
          title: `Collect evidence from ${indicator?.value ?? 'the affected host'}`,
          effect: 'Gathers a memory and disk triage package. Does not change the host.',
          evidence,
        };
      }
      return {
        category: 'Block',
        title: `Block ${indicator?.value ?? 'the destination'} on egress`,
        effect: 'Blocks outbound traffic for all hosts. Reversible.',
        evidence,
      };
    },
    call: ({ category, title, effect, evidence }) => ({
      suffix: 'propose_action',
      args: { category, title, effect, disruption: 'medium', evidence_refs: evidence },
    }),
    reply: ({ title }) => `I proposed: ${title}. It waits for your approval in Overview.`,
  },
  {
    name: 'add_entity',
    match: (text) => {
      const m = text.match(/\badd\s+(host|user|entity)\s+["'\u201c]?([\w.@:-]*[\w@])/i);
      if (!m) return null;
      const [, kind, name] = m;
      const type = kind.toLowerCase() === 'entity' ? (IPV4.test(name) || DOMAIN.test(name) ? 'external' : 'host') : kind.toLowerCase();
      return { name, type };
    },
    call: ({ name, type }) => ({
      suffix: 'upsert_entity',
      args: { name, type, scope: 'suspected' },
    }),
    reply: ({ name, type }, { data }) => {
      const entity = data?.entity ?? deepFind(data, 'entity') ?? {};
      return `I added ${type} ${entity.name ?? name}${entity.ref ? ` (${entity.ref})` : ''} to the scope as suspected.`;
    },
  },
];

const FALLBACK_REPLY =
  'I can summarise what is unresolved, add an indicator, open or settle a claim, mark a task done, propose an action, or add an entity to the scope.';

const COMPACTION = {
  discussion_summary:
    'The analyst is working a security investigation. Evidence, claims and tasks were reviewed through the investigation tools.',
  user_intent: 'Work the investigation and decide next steps.',
  entities: [],
  key_topics: ['investigation'],
  outcomes_and_decisions: [],
  unanswered_questions: [],
};

// Decide the next assistant message from the request alone (the mock keeps no state between calls).
// Exact-match replies used by seed.mjs to reproduce scenario conversations as real rounds.
// Shape: { "<exact user prompt>": { "reply": "...", "tool": { "suffix": "...", "args": {} } } }
const SEED_REPLIES_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'seed_replies.json');
let seedCache = { mtimeMs: -1, data: {} };
const seedReplies = () => {
  try {
    const { mtimeMs } = fs.statSync(SEED_REPLIES_FILE);
    if (mtimeMs !== seedCache.mtimeMs) {
      seedCache = { mtimeMs, data: JSON.parse(fs.readFileSync(SEED_REPLIES_FILE, 'utf8')) };
    }
  } catch {
    seedCache = { mtimeMs: -1, data: {} };
  }
  return seedCache.data;
};

const decide = (body) => {
  const messages = body.messages ?? [];
  const system = messages.filter((m) => m.role === 'system').map((m) => textOf(m.content)).join('\n');
  // Agent Builder prefixes each user message in shared conversations with "[User: x — Sent: t]" and
  // bundles earlier skip-agent messages into the same turn; scripts match the newest segment only.
  const userText = latestUserText(messages).replace(/<attachments>[\s\S]*?<\/attachments>/g, '').split(/\[User: [^\]]*\]\s*/).map((part) => part.trim()).filter(Boolean).pop() ?? '';

  if (system.includes('title-generation') || body.tool_choice?.function?.name === 'set_title') {
    const title = userText.replace(/\s+/g, ' ').slice(0, 60) || 'Investigation';
    return { kind: 'title', script: 'title', toolCall: { name: 'set_title', args: { title } } };
  }
  if (body.tool_choice?.function?.name === 'compact_conversation') {
    return { kind: 'compaction', script: 'compaction', toolCall: { name: 'compact_conversation', args: COMPACTION } };
  }

  const last = messages[messages.length - 1];
  const seeded = seedReplies()[userText];
  if (seeded) {
    if (seeded.tool && last?.role !== 'tool') {
      try {
        return {
          kind: 'agent',
          script: 'seed_reply',
          toolCall: { name: findTool(body, seeded.tool.suffix), args: seeded.tool.args ?? {} },
        };
      } catch (e) {
        if (e.code !== 'TOOL_MISSING') throw e;
      }
    }
    return { kind: 'agent', script: 'seed_reply', text: seeded.reply };
  }

  const script = SCRIPTS.map((s) => ({ s, ctx: s.match(userText) })).find((x) => x.ctx);

  if (last?.role === 'tool') {
    const result = parseToolResult(last);
    const call = precedingCall(messages);
    if (result.error) {
      return { kind: 'agent', script: script?.s.name ?? 'tool_error', text: `The tool reported an error: ${result.error}` };
    }
    // Never loop: a tool result always ends the exchange with a reply.
    if (script && toolSuffix(call.name) === script.s.call(script.ctx).suffix) {
      return { kind: 'agent', script: script.s.name, text: script.s.reply(script.ctx, result, call) };
    }
    return { kind: 'agent', script: script?.s.name ?? 'after_tool', text: FALLBACK_REPLY };
  }

  if (!script) return { kind: 'agent', script: 'fallback', text: FALLBACK_REPLY };
  const { suffix, args } = script.s.call(script.ctx);
  try {
    return {
      kind: 'agent',
      script: script.s.name,
      toolCall: { name: findTool(body, `investigation_${suffix}`), args },
    };
  } catch (e) {
    if (e.code !== 'TOOL_MISSING') throw e;
    return { kind: 'agent', script: `${script.s.name}:tool_missing`, text: `I do not have the investigation_${suffix} tool in this conversation.` };
  }
};

// ---------------------------------------------------------------------------------------------
// Wire format (same framing as measure.mjs / @kbn/ftr-llm-proxy)
// ---------------------------------------------------------------------------------------------
const toolCallMessage = ({ name, args }) => ({
  role: 'assistant',
  content: '',
  tool_calls: [{ id: `call_${crypto.randomUUID()}`, type: 'function', function: { name, arguments: JSON.stringify(args) } }],
});

const chunk = (delta, finish = null) => ({
  id: crypto.randomUUID(),
  object: 'chat.completion.chunk',
  created: 0,
  model: 'gpt-4',
  choices: [{ delta, index: 0, finish_reason: finish }],
});

const respond = (res, body, decision) => {
  const msg = decision.toolCall ? toolCallMessage(decision.toolCall) : decision.text;
  if (body.stream) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    const delta =
      typeof msg === 'string'
        ? { role: 'assistant', content: msg }
        : { role: 'assistant', content: '', tool_calls: msg.tool_calls.map((tc, i) => ({ ...tc, index: i })) };
    res.write(`data: ${JSON.stringify(chunk(delta))}\n\n`);
    res.write(`data: ${JSON.stringify(chunk({}, 'stop'))}\n\n`);
    res.write('data: [DONE]\n\n');
    return res.end();
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      id: crypto.randomUUID(),
      created: Date.now(),
      model: 'gpt-4o',
      object: 'chat.completion',
      choices: [
        {
          index: 0,
          finish_reason: 'stop',
          message:
            typeof msg === 'string'
              ? { role: 'assistant', content: msg, refusal: null }
              : { role: 'assistant', content: '', refusal: null, tool_calls: msg.tool_calls },
          logprobs: null,
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
    })
  );
};

// ---------------------------------------------------------------------------------------------
// Capture
// ---------------------------------------------------------------------------------------------
const contentChars = (m) =>
  textOf(m.content).length + (m.tool_calls ? JSON.stringify(m.tool_calls).length : 0);

let captured = [];
let counter = 0;
let lastRaw = '';

const summarise = (n, decision, body, raw) => {
  const messages = body.messages ?? [];
  const roles = {};
  const roleChars = {};
  for (const m of messages) {
    roles[m.role] = (roles[m.role] ?? 0) + 1;
    roleChars[m.role] = (roleChars[m.role] ?? 0) + contentChars(m);
  }
  const names = toolNames(body);
  const digestLength = lastDigestLength(messages);
  return {
    n,
    at: new Date().toISOString(),
    kind: decision.kind,
    label: decision.script,
    tool_called: decision.toolCall?.name ?? null,
    stream: Boolean(body.stream),
    raw_chars: raw.length,
    est_tokens: estTokens(raw.length),
    messages: messages.length,
    roles,
    role_chars: roleChars,
    tools_offered: names.length,
    tools_chars: JSON.stringify(body.tools ?? []).length,
    tool_names: names,
    has_digest: digestLength > 0,
    digest_chars: digestLength,
    latest_user_text: latestUserText(messages),
  };
};

// ---------------------------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------------------------
const json = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload, null, 2));
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/_captured') {
    const n = Math.max(1, Number(url.searchParams.get('n') ?? 20));
    return json(res, 200, { total: counter, returned: Math.min(n, captured.length), requests: captured.slice(-n) });
  }
  if (req.method === 'GET' && url.pathname === '/_captured/last_raw') {
    res.writeHead(lastRaw ? 200 : 404, { 'Content-Type': 'application/json' });
    return res.end(lastRaw || '{}');
  }
  if (req.method === 'POST' && url.pathname === '/_reset') {
    captured = [];
    counter = 0;
    lastRaw = '';
    return json(res, 200, { ok: true });
  }
  if (req.method !== 'POST') {
    res.writeHead(404);
    return res.end();
  }

  let raw = '';
  for await (const c of req) raw += c;
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    res.writeHead(400);
    return res.end('invalid JSON');
  }

  let decision;
  try {
    decision = decide(body);
  } catch (e) {
    decision = { kind: 'script_error', script: 'error', text: `script error: ${e.message}` };
    console.error(`[mock] ${e.stack}`);
  }

  counter += 1;
  lastRaw = raw;
  const entry = summarise(counter, decision, body, raw);
  captured.push(entry);
  if (captured.length > MAX_CAPTURED) captured.shift();
  if (DUMP_DIR) fs.writeFileSync(path.join(DUMP_DIR, `req_${counter}_${decision.kind}.json`), raw);

  console.log(
    `[mock] #${counter} kind=${decision.kind} script=${decision.script} tool=${decision.toolCall?.name ?? '-'} ` +
      `msgs=${entry.messages} est_tokens=${entry.est_tokens} digest=${entry.digest_chars} stream=${entry.stream}`
  );
  respond(res, body, decision);
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => console.log(`[mock] listening on http://localhost:${PORT}`));
}

export { server };
