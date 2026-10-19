/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { IsolatedRunner } from './isolated_runner';
import type { Transport, WorkloadClass } from './protocol';

const transport = process.argv[2];
assert.ok(transport === 'thread' || transport === 'process');
const count = Number(process.argv[3]);
assert.ok(count === 1 || count === 10);
const classes: readonly WorkloadClass[] =
  count === 1
    ? ['alerting']
    : [
        'alerting',
        'alerting',
        'alerting',
        'alerting',
        'alerting',
        'alerting',
        'workflow',
        'workflow',
        'workflow',
        'agent',
      ];
const before = process.memoryUsage();
const started = performance.now();
const slots = classes.map(
  (workloadClass) => new IsolatedRunner(transport as Transport, workloadClass)
);
try {
  const ready = await Promise.all(slots.map((slot) => slot.ready));
  const coldReadyMs = performance.now() - started;
  const afterReady = process.memoryUsage();
  const roundTrips = slots.map(async (slot) => {
    const sent = performance.now();
    const result = await slot.run({ fixture: 'wait', durationMs: 100, deadlineMs: 5000 });
    return { wall_ms: performance.now() - sent, executor_ms: result.durationMs };
  });
  await delay(20);
  assert.equal(slots.filter((slot) => slot.active).length, count);
  const during = process.memoryUsage();
  const completed = await Promise.all(roundTrips);
  console.log(
    JSON.stringify({
      transport,
      slots: count,
      classes,
      workload: 'lightweight_wait_fixture_NOT_real_plugin_mix',
      node: process.version,
      cold_ready_ms: coldReadyMs,
      parent_rss_before: before.rss,
      parent_rss_ready: afterReady.rss,
      parent_rss_active: during.rss,
      parent_rss_delta: during.rss - before.rss,
      // Child RSS snapshots are per process; worker RSS is process-wide and must not be summed.
      child_ready_rss_sum:
        transport === 'process' ? ready.reduce((sum, item) => sum + item.rss, 0) : null,
      isolate_ready_heap_sum: ready.reduce((sum, item) => sum + item.heapUsed, 0),
      round_trips: completed,
      sent_bytes: slots.reduce((sum, slot) => sum + slot.sentBytes, 0),
      received_bytes: slots.reduce((sum, slot) => sum + slot.receivedBytes, 0),
      memory_caveat: 'sampled_RSS_not_PSS_or_cgroup_peak; fresh_driver_per_configuration',
    })
  );
} finally {
  await Promise.all(slots.map((slot) => slot.stop()));
}
