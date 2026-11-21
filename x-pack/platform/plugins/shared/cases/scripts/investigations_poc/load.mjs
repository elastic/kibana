#!/usr/bin/env node
// Bulk synthetic investigation records and items for scale checks, plus a timing harness.
//
//   node load.mjs --records N --items M [--concurrency C] [--clean] [--measure] [--record <id>] [--seed S]
//
//   --records N      create N load records (tag `uipoc-load`)
//   --items M        create M items per record (bulk-created in chunks of <= 1000)
//   --concurrency C  parallel record creators (default 16)
//   --clean          delete only load records (Cases + investigation documents), then exit
//                    (when combined with --records, cleans first, then creates)
//   --measure        time the queue / lookup calls (median + p95 over 5 runs, plus server took_ms);
//                    with --record <id> (or right after creating records with items) also times item
//                    listing on that record. Results merge into
//                    unified-investigation-poc/verification/scale_results.json
//   --seed S         seed for the generator (default 1) so runs are reproducible
//
// Memory is bounded: records are created by a fixed pool of workers and items are generated one
// chunk at a time, so nothing grows with N except counters.
import fs from 'node:fs';
import path from 'node:path';
import { es, kbn, log, parseArgs, sleep } from './lib/client.mjs';

const BASE = '/internal/cases/investigations';
const LOAD_TAG = 'uipoc-load';
const RECORDS_INDEX = '.kibana-cases-investigation-records';
const ITEMS_INDEX = '.kibana-cases-investigation-items';
const ACTIVITY_INDEX = '.kibana-cases-investigation-activity';
const RESULTS_FILE =
  '/Users/michaelolorunnisola/Dev/kibana/unified-investigation-poc/verification/scale_results.json';

const MAX_BULK = 1000;
const MEASURE_RUNS = 5;
const DAY_MS = 24 * 3600 * 1000;

// --- deterministic generator --------------------------------------------------------------------

const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const pick = (rand, list) => list[Math.floor(rand() * list.length)];
const int = (rand, min, max) => min + Math.floor(rand() * (max - min + 1));

const INVESTIGATION_TYPES = ['Malware', 'Phishing', 'Account compromise', 'Alert triage'];
// Per type: the number field the template offers (key and range), if any. Ranges stay inside the template rules.
const NUMBER_FIELDS = {
  Malware: { key: 'hosts_affected_as_integer', min: 1, max: 500 },
  Phishing: { key: 'affected_users_as_integer', min: 1, max: 500 },
  'Alert triage': { key: 'alert_count_as_integer', min: 1, max: 500 },
};
const TEMPLATE_IDS = new Map(); // type name -> Cases template id, loaded from `_types` before records are created

const loadTemplateIds = async () => {
  const { json } = await kbn('GET', `${BASE}/_types`);
  for (const type of json.types ?? json) TEMPLATE_IDS.set(type.name, type.template_id);
  const missing = INVESTIGATION_TYPES.filter((name) => !TEMPLATE_IDS.has(name));
  if (missing.length) throw new Error(`investigation types not found: ${missing.join(', ')}. Run: node setup.mjs`);
};
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const BUSINESS_UNITS = [
  'Finance',
  'Engineering',
  'Sales',
  'Legal',
  'HR',
  'Operations',
  'Marketing',
  'Support',
];
const NOUNS = ['workstation', 'mail gateway', 'file server', 'VPN session', 'build agent', 'service account'];
const VERBS = ['Suspicious activity on', 'Unusual sign-in to', 'Malicious attachment reaching', 'Beaconing from'];

/** Shared pool of ~200 indicator values; records draw from it so values repeat across records. */
const INDICATOR_POOL = (() => {
  const rand = mulberry32(424242);
  const pool = [];
  for (let i = 0; i < 80; i++) {
    pool.push({ type: 'ip', value: `${int(rand, 11, 223)}.${int(rand, 0, 255)}.${int(rand, 0, 255)}.${int(rand, 1, 254)}` });
  }
  for (let i = 0; i < 50; i++) {
    pool.push({ type: 'domain', value: `pool-${i}-${int(rand, 1000, 9999)}.${pick(rand, ['example', 'test', 'invalid'])}` });
  }
  for (let i = 0; i < 40; i++) {
    let hash = '';
    for (let j = 0; j < 64; j++) hash += '0123456789abcdef'[int(rand, 0, 15)];
    pool.push({ type: 'file_hash', value: hash });
  }
  for (let i = 0; i < 30; i++) {
    pool.push({ type: 'url', value: `https://pool-${i}.example/${int(rand, 1000, 9999)}/payload` });
  }
  return pool;
})();

const buildRecordBody = (rand, index) => {
  const type = pick(rand, INVESTIGATION_TYPES);
  const priority = pick(rand, PRIORITIES);
  const createdAt = new Date(Date.now() - Math.floor(rand() * 90 * DAY_MS)).toISOString();
  const unit = pick(rand, BUSINESS_UNITS);
  const number = NUMBER_FIELDS[type];
  return {
    title: `${pick(rand, VERBS)} ${pick(rand, NOUNS)} ${unit.toLowerCase()}-${index} (${type})`,
    description: `Synthetic load-test investigation ${index} of type ${type}.`,
    template_id: TEMPLATE_IDS.get(type),
    priority,
    severity: priority,
    tags: [LOAD_TAG],
    extended_fields: {
      business_unit_as_keyword: unit,
      impact_as_keyword: `${int(rand, 1, 500)} hosts, ${int(rand, 1, 500)} users`,
      ...(number && { [number.key]: String(int(rand, number.min, number.max)) }),
    },
    ai_enabled: false,
    apply_procedure: false,
    create_conversation: false,
    created_at: createdAt,
  };
};

const PHASES = ['Triage', 'Investigate', 'Contain', 'Eradicate and recover', 'Close out'];
const EVENT_CATEGORIES = ['process', 'network', 'authentication', 'file', 'registry'];

/** One item of the mix. `usedValues` keeps indicator values unique within a record. */
const buildItem = (rand, recordIndex, j, usedValues) => {
  const roll = rand();
  if (roll < 0.4) {
    // Indicator: 70% from the shared pool (repeats across records), else unique to this record.
    let indicator;
    if (rand() < 0.7) {
      for (let attempt = 0; attempt < 8 && !indicator; attempt++) {
        const candidate = pick(rand, INDICATOR_POOL);
        if (!usedValues.has(candidate.value)) indicator = candidate;
      }
    }
    if (!indicator) indicator = { type: 'domain', value: `u${recordIndex}-${j}.example` };
    usedValues.add(indicator.value);
    return {
      kind: 'evidence',
      title: indicator.value,
      evidence: {
        type: 'indicator',
        why: 'Seen in load-test telemetry',
        source: { label: 'Threat intel feed', kind: 'manual' },
        indicator,
        snapshot: {
          kind: 'indicator',
          facts: [['Type', indicator.type]],
          intel: [['Reputation', pick(rand, ['malicious', 'suspicious', 'unknown'])]],
          seen: [['Sightings', String(int(rand, 1, 40))]],
        },
      },
    };
  }
  if (roll < 0.55) {
    return {
      kind: 'evidence',
      title: `Analyst note ${j}`,
      text: `Load-test note ${j} on record ${recordIndex}: reviewed telemetry and found nothing conclusive.`,
      evidence: {
        type: 'note',
        source: { label: 'Analyst', kind: 'manual' },
        snapshot: { kind: 'note', text: `Load-test note ${j}` },
      },
    };
  }
  if (roll < 0.7) {
    // Alert-like, but typed `event` so no real alert gets linked.
    const category = pick(rand, EVENT_CATEGORIES);
    return {
      kind: 'evidence',
      title: `${category} event ${j}`,
      evidence: {
        type: 'event',
        source: { label: 'Endpoint event', kind: 'document' },
        snapshot: {
          kind: 'event',
          category,
          timestamp: new Date(Date.now() - int(rand, 1, 72) * 3600 * 1000).toISOString(),
          fields: [
            ['host.name', `host-${int(rand, 1, 500)}`],
            ['user.name', `user${int(rand, 1, 300)}`],
          ],
        },
      },
    };
  }
  if (roll < 0.8) {
    return {
      kind: 'claim',
      title: `Claim ${j}`,
      status: 'open',
      claim: {
        question: `Is activity ${j} on record ${recordIndex} malicious?`,
        needs_review: false,
        supporting_evidence_ids: [],
        opposing_evidence_ids: [],
        gaps: [],
      },
    };
  }
  if (roll < 0.9) {
    return {
      kind: 'task',
      title: `Task ${j}: ${pick(rand, ['collect logs', 'isolate host', 'reset credentials', 'review mail trace'])}`,
      status: 'todo',
      task: {
        phase: pick(rand, PHASES),
        required: false,
        owner: { type: 'person', id: null },
        order: j,
      },
    };
  }
  const entityType = pick(rand, ['host', 'user']);
  const name = `${entityType}-${recordIndex}-${j}`;
  return {
    kind: 'entity',
    title: name,
    status: 'scoped',
    entity: { type: entityType, name, evidence_ids: [], attributes: [], tags: [] },
  };
};

// --- request helpers ----------------------------------------------------------------------------

// Retries connection errors (the dev server restarts whenever its source changes), 429 and 5xx.
const withRetry = async (fn, attempts = 7) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable = !error.status || error.status === 429 || error.status >= 500;
      if (!retryable || attempt === attempts) break;
      await sleep(Math.min(250 * attempt * attempt, 10000));
    }
  }
  throw lastError;
};

const bulkCreateItems = async (recordId, items) =>
  withRetry(() =>
    kbn('POST', `${BASE}/${encodeURIComponent(recordId)}/items/_bulk_create`, {
      items,
      extract_indicators: false,
      link_alerts: false,
    })
  );

// --- create -------------------------------------------------------------------------------------

const createLoad = async ({ records, items, concurrency, seed }) => {
  log(`creating ${records} records x ${items} items (concurrency ${concurrency}, seed ${seed})`);
  await loadTemplateIds();
  const started = Date.now();
  let next = 0;
  let done = 0;
  let itemsCreated = 0;
  let itemErrors = 0;
  let recordErrors = 0;
  const errors = [];
  let firstRecordWithItems;

  const worker = async () => {
    for (;;) {
      const index = next++;
      if (index >= records) return;
      const rand = mulberry32(seed * 1_000_003 + index);
      try {
        const { json } = await withRetry(() => kbn('POST', BASE, buildRecordBody(rand, index)));
        const recordId = json.record.id;
        const usedValues = new Set();
        for (let offset = 0; offset < items; offset += MAX_BULK) {
          const size = Math.min(MAX_BULK, items - offset);
          const chunk = Array.from({ length: size }, (_, k) => buildItem(rand, index, offset + k, usedValues));
          const res = await bulkCreateItems(recordId, chunk);
          const failed = res.json?.errors?.length ?? 0;
          itemsCreated += size - failed;
          itemErrors += failed;
          if (failed > 0 && errors.length < 5) errors.push(res.json.errors[0].message);
        }
        if (items > 0 && !firstRecordWithItems) firstRecordWithItems = recordId;
      } catch (error) {
        recordErrors++;
        if (errors.length < 5) errors.push(error.message.slice(0, 300));
      }
      done++;
      if (done % 500 === 0 || done === records) {
        const seconds = (Date.now() - started) / 1000;
        log(
          `progress ${done}/${records} records, ${itemsCreated} items ` +
            `(${(done / seconds).toFixed(1)} rec/s, ${(itemsCreated / seconds).toFixed(0)} items/s)`
        );
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(records, 1)) }, worker));

  const seconds = (Date.now() - started) / 1000;
  const summary = {
    records_requested: records,
    records_created: done - recordErrors,
    record_errors: recordErrors,
    items_per_record: items,
    items_created: itemsCreated,
    item_errors: itemErrors,
    concurrency,
    seconds: Number(seconds.toFixed(2)),
    records_per_s: Number((done / seconds).toFixed(2)),
    items_per_s: Number((itemsCreated / seconds).toFixed(1)),
    first_errors: errors.slice(0, 5),
    measured_at: new Date().toISOString(),
  };
  log(
    `done: ${summary.records_created}/${records} records, ${itemsCreated} items in ${summary.seconds}s ` +
      `-> ${summary.records_per_s} records/s, ${summary.items_per_s} items/s, ` +
      `${recordErrors} record errors, ${itemErrors} item errors`
  );
  for (const message of summary.first_errors) log(`  error: ${message}`);
  return { summary, firstRecordWithItems };
};

// --- clean --------------------------------------------------------------------------------------

const clean = async () => {
  log(`cleaning load records (tag ${LOAD_TAG})`);
  const started = Date.now();
  let removed = 0;
  let previous = '';
  for (;;) {
    // Page 1 every time: deleted records drop out of the result, and deep pages are capped.
    const params = new URLSearchParams({ tags: LOAD_TAG, per_page: '100', sort_field: 'created_at' });
    const { json } = await kbn('GET', `${BASE}/_find?${params}`);
    const ids = (json.records ?? []).filter((r) => r.tags?.includes(LOAD_TAG)).map((r) => r.id);
    if (ids.length === 0) break;
    if (ids.join() === previous) throw new Error('clean made no progress (the same 100 records came back)');
    previous = ids.join();

    await withRetry(() =>
      kbn('DELETE', `/api/cases?ids=${encodeURIComponent(JSON.stringify(ids))}`, undefined, {
        public: true,
        okStatuses: [200, 204, 404],
      })
    );
    for (const [index, field] of [
      [RECORDS_INDEX, 'id'],
      [ITEMS_INDEX, 'record_id'],
      [ACTIVITY_INDEX, 'record_id'],
    ]) {
      await withRetry(() =>
        es(
          'POST',
          `/${index}/_delete_by_query?refresh=true&conflicts=proceed&wait_for_completion=true`,
          { query: { terms: { [field]: ids } } },
          { okStatuses: [200, 404] }
        )
      );
    }
    removed += ids.length;
    if (removed % 500 < ids.length) log(`cleaned ${removed} records`);
  }
  log(`clean done: ${removed} records removed in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  return removed;
};

// --- measure ------------------------------------------------------------------------------------

const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];

const summarise = (wall, took, extra = {}) => {
  const sortedWall = [...wall].sort((a, b) => a - b);
  const sortedTook = took.filter((t) => typeof t === 'number').sort((a, b) => a - b);
  return {
    runs: wall.length,
    median_ms: percentile(sortedWall, 0.5),
    p95_ms: percentile(sortedWall, 0.95),
    took_median_ms: sortedTook.length ? percentile(sortedTook, 0.5) : null,
    took_p95_ms: sortedTook.length ? percentile(sortedTook, 0.95) : null,
    ...extra,
  };
};

/** Runs `call` (returns { ms, json }) MEASURE_RUNS times after one untimed warm-up. */
const timeCall = async (call, { runs = MEASURE_RUNS, warmup = true, extra } = {}) => {
  if (warmup) await call();
  const wall = [];
  const took = [];
  let last;
  for (let i = 0; i < runs; i++) {
    last = await call();
    wall.push(last.ms);
    took.push(last.json?.took_ms);
  }
  return summarise(wall, took, extra?.(last));
};

const printTable = (title, results) => {
  console.log(`\n${title}`);
  const rows = Object.entries(results);
  const width = Math.max(...rows.map(([name]) => name.length), 10);
  console.log(`${'call'.padEnd(width)}  ${'median ms'.padStart(9)}  ${'p95 ms'.padStart(7)}  ${'took med'.padStart(8)}  ${'took p95'.padStart(8)}  note`);
  for (const [name, r] of rows) {
    const fmt = (v) => (v === null || v === undefined ? '-' : String(v));
    console.log(
      `${name.padEnd(width)}  ${fmt(r.median_ms).padStart(9)}  ${fmt(r.p95_ms).padStart(7)}  ${fmt(r.took_median_ms).padStart(8)}  ${fmt(r.took_p95_ms).padStart(8)}  ${r.note ?? ''}`
    );
  }
};

const find = (query) => async () => {
  const res = await kbn('GET', `${BASE}/_find?${new URLSearchParams(query)}`);
  return res;
};

const measureQueue = async () => {
  const probe = await kbn('GET', `${BASE}/_find?per_page=1`);
  const total = probe.json.total;
  const totalNote = (res) => `total ${res.json.total}, returned ${res.json.records.length}`;
  const poolValues = INDICATOR_POOL.slice(0, 50).map(({ value }) => value);

  const calls = {
    'queue first page (default sort)': find({ per_page: '25' }),
    'sort title': find({ per_page: '25', sort_field: 'title', sort_order: 'asc' }),
    'sort priority': find({ per_page: '25', sort_field: 'priority', sort_order: 'desc' }),
    'sort fields.hosts_affected_long': find({ per_page: '25', sort_field: 'fields.hosts_affected_long', sort_order: 'desc' }),
    'sort fields.business_unit_keyword': find({ per_page: '25', sort_field: 'fields.business_unit_keyword', sort_order: 'asc' }),
    'sort counters.evidence': find({ per_page: '25', sort_field: 'counters.evidence', sort_order: 'desc' }),
    'text search ("malware")': find({ per_page: '25', search: 'malware' }),
    'filter business_unit_keyword:Finance': find({ per_page: '25', field: 'business_unit_keyword:Finance' }),
    'deep page (page 100 of 25)': find({ per_page: '25', page: '100' }),
    'observable lookup (50 values)': async () =>
      kbn('GET', `${INVESTIGATIONS_INDICATOR_URL}?${poolValues.map((v) => `values=${encodeURIComponent(v)}`).join('&')}`),
  };

  const results = {};
  for (const [name, call] of Object.entries(calls)) {
    try {
      results[name] = await timeCall(call, {
        extra: (res) => {
          const note =
            name.startsWith('observable') ? `${Object.keys(res.json.values ?? {}).length} values matched` : totalNote(res);
          return { note };
        },
      });
    } catch (error) {
      results[name] = { runs: 0, error: error.message.slice(0, 300), note: `ERROR ${error.status ?? ''}` };
    }
  }
  printTable(`Queue measurements (${total} records in the index, ${MEASURE_RUNS} runs each)`, results);
  return { total_records: total, results };
};

const INVESTIGATIONS_INDICATOR_URL = `${BASE}/_indicators`;

const measureItems = async (recordId) => {
  const base = `${BASE}/${encodeURIComponent(recordId)}/items`;
  const probe = await kbn('GET', `${base}?per_page=1`);
  const results = {};

  results['items first page (100)'] = await timeCall(() => kbn('GET', `${base}?per_page=100`), {
    extra: (res) => ({ note: `total ${res.json.total}, returned ${res.json.items.length}` }),
  });

  // Deep page by cursor: walk 40 pages untimed, time the 41st.
  const deepCursor = async () => {
    let cursor;
    let pages = 0;
    for (; pages < 40; pages++) {
      const query = new URLSearchParams({ per_page: '100', ...(cursor && { cursor }) });
      const res = await kbn('GET', `${base}?${query}`);
      cursor = res.json.next_cursor;
      if (!cursor) return { reached: pages + 1 };
    }
    const query = new URLSearchParams({ per_page: '100', cursor });
    const res = await kbn('GET', `${base}?${query}`);
    return { ...res, reached: 41 };
  };
  try {
    const first = await deepCursor();
    if (first.reached < 41) {
      results['items deep page via cursor (41st)'] = {
        runs: 0,
        note: `record has only ${first.reached} pages of 100 (${probe.json.total} items); need >4,000 items`,
      };
    } else {
      const wall = [];
      const took = [];
      for (let i = 0; i < MEASURE_RUNS; i++) {
        const res = await deepCursor();
        wall.push(res.ms);
        took.push(res.json?.took_ms);
      }
      results['items deep page via cursor (41st)'] = summarise(wall, took, { note: 'cursor chain of 40 untimed pages, 41st timed' });
    }
  } catch (error) {
    results['items deep page via cursor (41st)'] = { runs: 0, error: error.message.slice(0, 300), note: 'ERROR' };
  }

  // Prefer an `ip` indicator that exists on the record, so the filter and the search hit something.
  const sample = (
    await kbn('GET', `${base}?${new URLSearchParams({ per_page: '100', type: 'indicator' })}`)
  ).json.items.map((item) => item.evidence?.indicator).filter(Boolean);
  const target = sample.find((indicator) => indicator.type === 'ip') ?? sample[0];
  const indicatorType = target?.type === 'ip' || !target ? 'ip' : target.type;
  const searchValue = target?.value ?? INDICATOR_POOL[0].value;

  results[`items filtered (type=indicator&indicator_type=${indicatorType})`] = await timeCall(
    () => kbn('GET', `${base}?${new URLSearchParams({ per_page: '100', type: 'indicator', indicator_type: indicatorType })}`),
    { extra: (res) => ({ note: `total ${res.json.total}` }) }
  );

  results['items free-text search (one value)'] = await timeCall(
    () => kbn('GET', `${base}?${new URLSearchParams({ per_page: '100', search: searchValue })}`),
    { extra: (res) => ({ note: `value ${searchValue.slice(0, 24)}, total ${res.json.total}` }) }
  );

  // Bulk add of 1,000 unique indicators (one timed run: it adds 1,000 items to the record).
  const stamp = Date.now();
  const bulk = Array.from({ length: MAX_BULK }, (_, k) => ({
    kind: 'evidence',
    title: `bulk-${stamp}-${k}.example`,
    evidence: {
      type: 'indicator',
      source: { label: 'Bulk add', kind: 'manual' },
      indicator: { type: 'domain', value: `bulk-${stamp}-${k}.example` },
    },
  }));
  const bulkRes = await kbn('POST', `${base}/_bulk_create`, {
    items: bulk,
    extract_indicators: false,
    link_alerts: false,
  });
  results['bulk add 1,000 items (1 run)'] = summarise([bulkRes.ms], [bulkRes.json?.took_ms], {
    note: `${bulkRes.json.items?.length ?? 0} created, ${bulkRes.json.errors?.length ?? 0} errors`,
  });

  printTable(`Item measurements (record ${recordId}, ${probe.json.total} items before the bulk add)`, results);
  return { record_id: recordId, items_before_bulk_add: probe.json.total, results };
};

const mergeResults = (patch) => {
  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
  } catch {
    existing = {};
  }
  fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
  fs.writeFileSync(RESULTS_FILE, `${JSON.stringify({ ...existing, ...patch }, null, 2)}\n`);
  log(`results merged into ${RESULTS_FILE}`);
};

// --- main ---------------------------------------------------------------------------------------

const main = async () => {
  const args = parseArgs();
  const records = Number(args.records ?? 0);
  const items = Number(args.items ?? 0);
  const concurrency = Number(args.concurrency ?? 16);
  const seed = Number(args.seed ?? 1);
  if (!args.clean && !args.measure && records === 0) {
    console.log('usage: node load.mjs --records N --items M [--concurrency C] [--clean] [--measure] [--record <id>]');
    process.exit(1);
  }

  if (args.clean) await clean();

  let measureRecord = typeof args.record === 'string' ? args.record : undefined;
  const patch = {};
  if (records > 0) {
    const { summary, firstRecordWithItems } = await createLoad({ records, items, concurrency, seed });
    patch.load = summary;
    measureRecord ??= firstRecordWithItems;
  }

  if (args.measure) {
    patch.queue = { measured_at: new Date().toISOString(), ...(await measureQueue()) };
    if (measureRecord) {
      patch.items = { measured_at: new Date().toISOString(), ...(await measureItems(measureRecord)) };
    } else {
      log('no --record given and no records created with items: skipping item measurements');
    }
  }
  if (Object.keys(patch).length > 0) mergeResults(patch);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
