/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import type { CapsuleProbeResult } from '../task_capsule/capsule_kernel.ts';

type ProbeEnvelope =
  | { readonly ok: true; readonly result: CapsuleProbeResult }
  | { readonly ok: false; readonly error: string; readonly stack?: string };

const count = Number(process.argv[2] ?? 1);
assert.ok(count === 1 || count === 10);
const entry = new URL('../task_capsule/capsule_entry.cts', import.meta.url);
const env = {
  ...process.env,
  NODE_PATH: '/Users/jloleysens/repos/work/kibana/node_modules',
  NODE_DISABLE_COMPILE_CACHE: '1',
  DISABLE_SWC_REGISTER_CACHE: '1',
  DEBUG_SWC_REGISTER_CACHE: '',
};
const controlArgs =
  process.env.WIR_FORCE_GC === '1' ? ['--expose-gc', fileURLToPath(entry)] : [fileURLToPath(entry)];
const control = JSON.parse(
  execFileSync(process.execPath, controlArgs, { env, timeout: 15000, encoding: 'utf8' })
) as ProbeEnvelope;
assert.ok(control.ok, JSON.stringify(control));
const started = performance.now();
const before = process.memoryUsage();
const workers = Array.from({ length: count }, () => new Worker(entry, { env }));
const receiveProbe = (worker: Worker): Promise<ProbeEnvelope> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Capsule probe deadline exceeded')), 15000);
    worker.once('message', (message: ProbeEnvelope) => {
      clearTimeout(timer);
      resolve(message);
    });
    worker.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    worker.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Capsule exited before its result: ${code}`));
    });
  });
try {
  const messages = await Promise.all(workers.map(receiveProbe));
  const results = messages.map((message) => {
    assert.ok(message.ok, JSON.stringify(message));
    assert.deepEqual(message.result.attributes, control.result.attributes);
    assert.equal(message.result.typeMigrationVersion, control.result.typeMigrationVersion);
    assert.equal(message.result.transportCalls, 2);
    return message.result;
  });
  assert.equal(control.result.transportCalls, 2);
  console.log(
    JSON.stringify({
      run_id: process.env.WIR_RUN_ID ?? 'unregistered',
      canonical_equal: true,
      resident_capsules: count,
      batch_cold_ms: performance.now() - started,
      parent_rss_before: before.rss,
      process_rss_after_all_resident: process.memoryUsage().rss,
      process_rss_delta: process.memoryUsage().rss - before.rss,
      isolate_heap_samples_sum: results.reduce((sum, result) => sum + result.heap_used, 0),
      control: control.result,
      workers: results,
      limits: [
        'fixture-only_document_migration_and_SO_get; not_ESO_RBAC_or_task_adoption',
        'all_workers_held_resident_until_finally; heap_samples_not_simultaneous_peaks',
        'process_RSS_not_PSS_or_cgroup; never_sum_worker_RSS',
        'NOT_a_realistic_6_alerting_3_workflow_1_agent_service_mix',
      ],
    })
  );
} finally {
  await Promise.all(workers.map((worker) => worker.terminate()));
}
