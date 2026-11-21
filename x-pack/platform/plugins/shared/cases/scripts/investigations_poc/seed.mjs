// Recreates the five scenarios of the design prototype through the real investigation API.
//
//   node seed.mjs --scenario A|B|C|D|E|all [--clean]
//
// Env: KBN_URL (http://localhost:5602), ES_URL (http://localhost:9201), KBN_AUTH (elastic:changeme),
//      SEED_CONNECTOR (uipoc-mock-llm), SEED_PUBLIC_URL (http://localhost:5602)
// Seeded records carry the tags `uipoc-seed` and `uipoc-seed-<scenario>`; `--clean` removes only those.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, waitForKibana, log, kbn } from './lib/client.mjs';
import { cleanSeedRule, ensureSeedRule } from './lib/alerts.mjs';
import { cleanScenario, replyRegistry, mismatchedReplies, agentRounds, AGENT_ID } from './lib/scenarios/common.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ORDER = ['A', 'B', 'C', 'D', 'E'];

const loadScenario = async (id) => import(`./lib/scenarios/${id.toLowerCase()}.mjs`);

const writeSeedReplies = () => {
  const file = path.join(here, 'seed_replies.json');
  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    existing = {};
  }
  const current = JSON.stringify(existing, null, 2);
  const next = JSON.stringify({ ...existing, ...Object.fromEntries(replyRegistry) }, null, 2);
  if (current.trim() !== next.trim()) fs.writeFileSync(file, `${next}\n`);
};

const PREFLIGHT_PROMPT = 'uipoc seed preflight: say the canned answer';
const PREFLIGHT_REPLY = 'uipoc seed preflight ok';

/**
 * The mock model answers seeded prompts from seed_replies.json by exact match on the user text. Agent Builder prepends
 * "[User: <name> - Sent: <time>]" to that text, so check (localhost only) that the running mock copes with it.
 * Without it the keyword scripts would answer instead, and could call tools that change the seeded data.
 */
const preflightMock = async () => {
  const file = path.join(here, 'seed_replies.json');
  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    existing = {};
  }
  if (existing[PREFLIGHT_PROMPT]?.reply !== PREFLIGHT_REPLY) {
    fs.writeFileSync(file, `${JSON.stringify({ ...existing, [PREFLIGHT_PROMPT]: { reply: PREFLIGHT_REPLY } }, null, 2)}\n`);
  }
  const port = process.env.MOCK_PORT ?? '18555';
  const body = {
    model: 'gpt-4',
    stream: false,
    messages: [
      { role: 'system', content: 'preflight' },
      { role: 'user', content: `[User: preflight \u2014 Sent: 2026-01-01T00:00:00Z]\n\n${PREFLIGHT_PROMPT}` },
    ],
  };
  try {
    const res = await fetch(`http://localhost:${port}/v1/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content ?? '';
    if (text === PREFLIGHT_REPLY) return { ok: true };
    return { ok: false, reason: `the mock on port ${port} answered "${String(text).slice(0, 80)}" instead of the seeded reply (it must strip the "[User: ... Sent: ...]" header before the seed_replies.json lookup)` };
  } catch (e) {
    return { ok: false, reason: `the mock model is not reachable on port ${port} (${e.message}); start it with: node mock_llm.mjs &` };
  }
};

const printTable = (rows) => {
  if (!rows.length) return;
  const cols = ['scenario', 'display_id', 'id', 'status', 'priority', 'owner', 'assignees', 'evidence', 'alerts', 'indicators', 'claims', 'tasks', 'proposals', 'entities', 'links', 'timeline', 'comments', 'case_comments', 'activity', 'threads', 'seconds'];
  console.log(`\n${cols.join(' | ')}`);
  for (const r of rows) console.log(cols.map((c) => String(r[c] ?? '')).join(' | '));
};

const main = async () => {
  const args = parseArgs();
  const scenarioArg = String(args.scenario ?? (args.clean ? 'all' : '')).toUpperCase();
  if (!scenarioArg || (scenarioArg !== 'ALL' && !ORDER.includes(scenarioArg))) {
    console.error('Usage: node seed.mjs --scenario A|B|C|D|E|all [--clean]');
    process.exit(1);
  }
  const ids = scenarioArg === 'ALL' ? ORDER : [scenarioArg];
  await waitForKibana({ timeoutMs: 60_000 });

  if (args.clean) {
    for (const id of ids) {
      const removed = await cleanScenario(id);
      log(`cleaned scenario ${id}: ${JSON.stringify(removed)}`);
    }
    if (scenarioArg === 'ALL') {
      await cleanSeedRule();
      log('removed the seed rule, its alerts and the uipoc-events index');
    }
    return;
  }

  // The scenarios rely on the POC status configuration (built-in defaults, "Waiting on the employee" enabled).
  const { json: statusConfig } = await kbn('GET', '/internal/cases/investigations/_statuses');
  const builtInsAreDefaults = ['open', 'in-progress', 'closed'].every((key) =>
    (statusConfig.statuses ?? []).some((s) => s.key === key && s.isDefault && !s.disabled)
  );
  const waiting = (statusConfig.statuses ?? []).find((s) => s.key === 'waiting_on_the_employee');
  if (!builtInsAreDefaults || !waiting || waiting.disabled) {
    console.error('The status configuration is not the POC one (built-ins as defaults, "Waiting on the employee" enabled). Run: node setup.mjs');
    process.exit(1);
  }

  const agent = await kbn('GET', `/api/agent_builder/agents/${AGENT_ID}`, undefined, { okStatuses: [200, 404] });
  if (agent.status !== 200) log(`WARNING: agent ${AGENT_ID} not found. Run "node setup.mjs" first; AI scenarios will have no conversations.`);
  await kbn('GET', '/api/actions/connector/uipoc-mock-llm', undefined, { okStatuses: [200, 404] });
  await ensureSeedRule();

  const preflight = await preflightMock();
  agentRounds.enabled = preflight.ok;
  agentRounds.reason = preflight.reason ?? '';
  if (!preflight.ok) log(`WARNING: agent rounds are skipped, only human messages are seeded: ${preflight.reason}`);

  const summaries = [];
  for (const id of ids) {
    const started = Date.now();
    log(`=== scenario ${id}: cleaning previous seed`);
    const removed = await cleanScenario(id);
    if (removed.records) log(`  removed ${removed.records} record(s), ${removed.items} items, ${removed.activity} activity entries`);
    log(`=== scenario ${id}: seeding`);
    const mod = await loadScenario(id);
    const { summary } = await mod.run();
    summary.seconds = ((Date.now() - started) / 1000).toFixed(1);
    summaries.push(summary);
    writeSeedReplies();
    log(`=== scenario ${id}: ${summary.display_id} ${summary.id} in ${summary.seconds}s`);
    log(`    ${summary.url}`);
  }
  printTable(summaries);
  if (!agentRounds.enabled) {
    console.log(`\nWARNING: ${agentRounds.skipped} agent message(s) were NOT seeded because ${agentRounds.reason}.`);
  }
  if (mismatchedReplies.length) {
    console.log(`\nWARNING: ${mismatchedReplies.length} agent reply(ies) did not match the seeded text. The mock model must look up seed_replies.json by the user prompt without the "[User: ... Sent: ...]" header Agent Builder prepends. First mismatch: ${JSON.stringify(mismatchedReplies[0])}`);
  }
  console.log('\nJSON summary:');
  console.log(JSON.stringify(summaries, null, 2));
};

main().catch((e) => {
  console.error(e.stack ?? e.message);
  process.exit(1);
});
