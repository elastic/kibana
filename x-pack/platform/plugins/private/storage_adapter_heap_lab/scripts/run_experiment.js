/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * TEMPORARY experiment driver (DO NOT MERGE) for elastic/kibana-team#3973.
 *
 * Ramps up the number of @kbn/storage-adapter indices via the heap-lab plugin
 * endpoint, sampling ES heap / shard / field-count between steps so we can plot
 * heap growth against #shards and #fields.
 *
 * Usage (local dev Kibana started with --no-base-path):
 *   node x-pack/platform/plugins/private/storage_adapter_heap_lab/scripts/run_experiment.js
 *
 * Configuration via env vars:
 *   KIBANA_URL         default http://localhost:5601
 *   KBN_USER/KBN_PASS  default elastic/changeme (basic auth, local dev)
 *   KBN_API_KEY        if set, used instead of basic auth (serverless)
 *   NUM_FIELDS         fields per index/document           (default 100)
 *   DOCS_PER_INDEX     documents inserted per index        (default 10)
 *   STEP_INDICES       indices created per ramp step        (default 25)
 *   STEPS              number of ramp steps                 (default 20)
 *   STABILIZE_MS       wait after each step before sampling (default 30000)
 *   SETTLE_MS          short pause before first sample      (default 2000)
 *   INDEX_PREFIX       index name prefix                    (default heaplab)
 *   OUT                CSV output path                      (default ./heaplab_results.csv)
 *
 * Forced-GC mode (measures true post-GC live set instead of a noisy min):
 *   ES_PID             pid of the local ES JVM; when set, a full GC is forced
 *                      (via jcmd) before each measurement and the reading is
 *                      recorded with phase "post_gc"
 *   JCMD               path to jcmd (default: bundled .es JDK jcmd)
 *   GC_SETTLE_MS       pause after forcing GC before reading heap (default 4000)
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const KIBANA_URL = process.env.KIBANA_URL || 'http://localhost:5601';
const KBN_USER = process.env.KBN_USER || 'elastic';
const KBN_PASS = process.env.KBN_PASS || 'changeme';
const KBN_API_KEY = process.env.KBN_API_KEY || '';

const NUM_FIELDS = Number(process.env.NUM_FIELDS || 100);
const DOCS_PER_INDEX = Number(process.env.DOCS_PER_INDEX || 10);
const STEP_INDICES = Number(process.env.STEP_INDICES || 25);
const STEPS = Number(process.env.STEPS || 20);
const STABILIZE_MS = Number(process.env.STABILIZE_MS || 30000);
const SETTLE_MS = Number(process.env.SETTLE_MS || 2000);
const INDEX_PREFIX = process.env.INDEX_PREFIX || 'heaplab';
const UNIQUE_FIELDS = /^(1|true|yes)$/i.test(process.env.UNIQUE_FIELDS || '');
const OUT = process.env.OUT || path.resolve(process.cwd(), 'heaplab_results.csv');

const ES_PID = process.env.ES_PID || '';
const JCMD =
  process.env.JCMD ||
  path.resolve(process.cwd(), '.es/9.6.0/jdk.app/Contents/Home/bin/jcmd');
const GC_SETTLE_MS = Number(process.env.GC_SETTLE_MS || 4000);
const FORCE_GC = Boolean(ES_PID);

const authHeader = KBN_API_KEY
  ? `ApiKey ${KBN_API_KEY}`
  : `Basic ${Buffer.from(`${KBN_USER}:${KBN_PASS}`).toString('base64')}`;

const baseHeaders = {
  'content-type': 'application/json',
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'heap-lab',
  authorization: authHeader,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Forces a full GC on the local ES JVM via jcmd (run twice to let G1 reclaim
 * humongous/old regions), so the subsequent heap reading approximates the
 * retained live set rather than pre-GC allocations.
 */
function forceGc() {
  if (!FORCE_GC) return;
  try {
    execFileSync(JCMD, [ES_PID, 'GC.run'], { stdio: 'ignore' });
    execFileSync(JCMD, [ES_PID, 'GC.run'], { stdio: 'ignore' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`  forceGc failed (pid=${ES_PID}): ${err.message}`);
  }
}

async function call(method, endpoint, body) {
  const response = await fetch(`${KIBANA_URL}${endpoint}`, {
    method,
    headers: baseHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${endpoint} -> ${response.status}: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : {};
}

const generate = (numIndices) =>
  call('POST', '/internal/storage_adapter_heap_lab/generate', {
    numIndices,
    numFields: NUM_FIELDS,
    numDocs: DOCS_PER_INDEX,
    indexPrefix: INDEX_PREFIX,
    uniqueFieldsPerIndex: UNIQUE_FIELDS,
  });

const stats = () => call('GET', '/internal/storage_adapter_heap_lab/stats');

const maxHeap = (nodes) =>
  nodes.reduce(
    (acc, n) => ({
      bytes: Math.max(acc.bytes, n.heapUsedBytes || 0),
      percent: Math.max(acc.percent, n.heapUsedPercent || 0),
    }),
    { bytes: 0, percent: 0 }
  );

const CSV_HEADER = [
  'iso_time',
  'phase',
  'step',
  'cumulative_indices_requested',
  'indices_count',
  'shards_total',
  'total_field_count',
  'total_dedup_field_count',
  'docs_count',
  'store_size_bytes',
  'cluster_status',
  'heap_used_bytes',
  'heap_used_percent',
  'note',
].join(',');

function appendRow(row) {
  fs.appendFileSync(OUT, row.map((v) => (v === undefined ? '' : v)).join(',') + '\n');
}

function logLine(phase, step, s, heap) {
  // eslint-disable-next-line no-console
  console.log(
    `[${phase}] step ${step} | idx=${s.indicesCount} shards=${s.shardsTotal} fields=${s.totalFieldCount} ` +
      `heap=${(heap.bytes / 1024 / 1024).toFixed(0)}MB (${heap.percent}%) status=${s.status}`
  );
}

async function sampleOnce(phase, step, cumulativeIndices, note) {
  const s = await stats();
  const heap = maxHeap(s.nodes || []);
  appendRow([
    s.timestamp,
    phase,
    step,
    cumulativeIndices,
    s.indicesCount,
    s.shardsTotal,
    s.totalFieldCount,
    s.totalDeduplicatedFieldCount,
    s.docsCount,
    s.storeSizeBytes,
    s.status,
    heap.bytes,
    heap.percent,
    note || '',
  ]);
  logLine(phase, step, s, heap);
  return { s, heap };
}

/**
 * Polls heap every ~5s across the stabilization window and records the sample
 * with the lowest heap (an approximation of retained heap after GC), so the
 * trend reflects retained mapping/cluster-state cost rather than transient GC.
 */
async function sampleRetained(step, cumulativeIndices) {
  const reads = Math.max(2, Math.floor(STABILIZE_MS / 5000));
  let best = null;
  for (let r = 0; r < reads; r++) {
    const s = await stats();
    const heap = maxHeap(s.nodes || []);
    if (!best || heap.bytes < best.heap.bytes) {
      best = { s, heap };
    }
    if (r < reads - 1) {
      await sleep(5000);
    }
  }
  appendRow([
    best.s.timestamp,
    'stabilized',
    step,
    cumulativeIndices,
    best.s.indicesCount,
    best.s.shardsTotal,
    best.s.totalFieldCount,
    best.s.totalDeduplicatedFieldCount,
    best.s.docsCount,
    best.s.storeSizeBytes,
    best.s.status,
    best.heap.bytes,
    best.heap.percent,
    'retained_min',
  ]);
  logLine('stabilized', step, best.s, best.heap);
  return best;
}

/**
 * Forces a full GC, waits for it to settle, then records a single reading as the
 * post-GC live set (used to derive per-index heap overhead).
 */
async function sampleAfterGc(step, cumulativeIndices) {
  forceGc();
  await sleep(GC_SETTLE_MS);
  const s = await stats();
  const heap = maxHeap(s.nodes || []);
  appendRow([
    s.timestamp,
    'post_gc',
    step,
    cumulativeIndices,
    s.indicesCount,
    s.shardsTotal,
    s.totalFieldCount,
    s.totalDeduplicatedFieldCount,
    s.docsCount,
    s.storeSizeBytes,
    s.status,
    heap.bytes,
    heap.percent,
    'post_gc_live_set',
  ]);
  logLine('post_gc', step, s, heap);
  return { s, heap };
}

async function main() {
  // eslint-disable-next-line no-console
  console.log(
    `heap-lab experiment -> ${KIBANA_URL}\n` +
      `  fields/index=${NUM_FIELDS} docs/index=${DOCS_PER_INDEX} step=${STEP_INDICES} steps=${STEPS} stabilize=${STABILIZE_MS}ms uniqueFields=${UNIQUE_FIELDS}\n` +
      `  forceGc=${FORCE_GC}${FORCE_GC ? ` (esPid=${ES_PID}, gcSettle=${GC_SETTLE_MS}ms)` : ''}\n` +
      `  output=${OUT}`
  );

  fs.writeFileSync(OUT, CSV_HEADER + '\n');

  if (FORCE_GC) {
    await sampleAfterGc(0, 0);
  } else {
    await sampleOnce('baseline', 0, 0, '');
  }

  let cumulative = 0;
  for (let step = 1; step <= STEPS; step++) {
    const startedAt = Date.now();
    let result;
    try {
      result = await generate(STEP_INDICES);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`  step ${step} generate FAILED: ${err.message}`);
      await sampleOnce(
        'breaking_point',
        step,
        cumulative + STEP_INDICES,
        err.message.replace(/[\r\n,]+/g, ' ').slice(0, 300)
      );
      break;
    }
    cumulative += STEP_INDICES;
    // eslint-disable-next-line no-console
    console.log(
      `  created step ${step}: +${STEP_INDICES} indices (${result.totalDocs} docs) in ${result.elapsedMs}ms`
    );

    await sleep(SETTLE_MS);
    await sampleOnce('immediate', step, cumulative, '');
    if (FORCE_GC) {
      await sampleAfterGc(step, cumulative);
    } else {
      await sampleRetained(step, cumulative);
    }

    // eslint-disable-next-line no-console
    console.log(`  step ${step} wall time ${Date.now() - startedAt}ms\n`);
  }

  // eslint-disable-next-line no-console
  console.log(`Done. Results written to ${OUT}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Experiment failed:', err.message);
  process.exit(1);
});
