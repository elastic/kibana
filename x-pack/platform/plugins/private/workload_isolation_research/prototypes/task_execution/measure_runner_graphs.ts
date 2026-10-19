/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { loadavg } from 'node:os';
import { once } from 'node:events';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { Worker } from 'node:worker_threads';

const root = process.cwd();
assert.equal(root, '/Users/jloleysens/repos/work/kibana-t1-isolated-tasks');
assert.ok(global.gc, 'Use node --expose-gc');
const evidence = process.env.WIR_EVIDENCE_DIR;
assert.ok(evidence);
const shape = process.env.WIR_GRAPH_SHAPE;
assert.ok(shape === 'pool' || shape === 'capsule');
const runId = `t1-runner-code-floor-${shape}-001`;
const contended = process.env.WIR_GRAPH_ALLOW_CONTENDED === '1';
const lock =
  '/Users/jloleysens/.agentic-work/projects/kibana/workload-isolation-research/bench.lock';
const workers: Worker[] = [];
const controller = new AbortController();
process.once('SIGTERM', () => controller.abort());
process.once('SIGINT', () => controller.abort());
let ownsLock = false;
const write = (suffix: string, data: object): void =>
  writeFileSync(join(evidence, `${runId}_${suffix}.json`), JSON.stringify(data, null, 2));
const families =
  shape === 'pool'
    ? ['alerting', 'workflow', 'agent']
    : [
        ...Array.from({ length: 6 }, () => 'alerting'),
        ...Array.from({ length: 3 }, () => 'workflow'),
        'agent',
      ];
write('manifest', {
  run_id: runId,
  source_commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  host_loadavg: loadavg(),
  load_time_comparable: !contended,
  coordinator_approved_contended_heap_measurement: contended,
  utc: new Date().toISOString(),
  hypothesis:
    'Real uninitialised runner import graphs already consume substantial per-isolate heap; initialized services/data can only add cost, but runtime/bundling can change the graph.',
  expected: {
    per_isolate_heap_mb: [80, 350],
    cold_load_ms: [200, 5000],
    capsule_10_process_rss_mb: [1500, 5000],
  },
  families,
  capacity:
    shape === 'pool'
      ? 'three resident slots, queues actual6/3/1 concurrency; NOT ten concurrently executing runners'
      : 'ten resident code graphs at6/3/1; NO actual runner execution',
  scope: 'code-graph floor only, no service initialization, no adoption, source-dev imports',
  status: 'preregistered',
});
try {
  while (!contended && !ownsLock) {
    controller.signal.throwIfAborted();
    try {
      mkdirSync(lock);
      ownsLock = true;
      writeFileSync(
        join(lock, 'owner.json'),
        JSON.stringify({
          track: 1,
          owner: runId,
          pid: process.pid,
          start: new Date().toISOString(),
        })
      );
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'EEXIST') throw error;
      await delay(10000, undefined, { signal: controller.signal });
    }
  }
  global.gc();
  const before = process.memoryUsage();
  const rows: Array<Record<string, unknown>> = [];
  for (const [index, family] of families.entries()) {
    controller.signal.throwIfAborted();
    const worker = new Worker(
      resolve(
        'x-pack/platform/plugins/private/workload_isolation_research/prototypes/task_capsule/runner_graph_entry.cts'
      ),
      { workerData: { family }, resourceLimits: { maxOldGenerationSizeMb: 512 } }
    );
    workers.push(worker);
    write('resources', {
      pid: process.pid,
      threads: workers.map((item) => item.threadId),
      status: 'running',
    });
    const [row] = (await once(worker, 'message', {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(120000)]),
    })) as [Record<string, unknown>];
    rows.push({ index, ...row });
    write('rows', { run_id: runId, rows });
    if (row.ok !== true)
      throw new Error(`Import graph failed for ${family}; inspect structured row`);
  }
  const resident: Array<Record<string, unknown>> = [];
  for (const worker of workers) {
    const response = once(worker, 'message', { signal: AbortSignal.timeout(10000) });
    worker.postMessage('snapshot');
    const [row] = (await response) as [Record<string, unknown>];
    resident.push(row);
  }
  global.gc();
  write('result', {
    run_id: runId,
    before,
    host_loadavg: loadavg(),
    load_time_comparable: !contended,
    after: process.memoryUsage(),
    rows,
    resident,
    status: 'complete',
    rss_scope: 'whole fresh parent+all held workers, never sum per-worker process RSS',
    limitation:
      'real code graphs only; initialized service graphs/data/execution excluded; source-dev loader costs retained; A3 is capacity3 floor not10 concurrent tasks',
  });
} finally {
  await Promise.all(workers.map((worker) => worker.terminate()));
  write('resources', {
    pid: process.pid,
    threads: workers.map((item) => item.threadId),
    status: 'stopped',
  });
  if (ownsLock) {
    const owner = JSON.parse(readFileSync(join(lock, 'owner.json'), 'utf8')) as { owner: string };
    assert.equal(owner.owner, runId);
    rmSync(lock, { recursive: true });
  }
}
