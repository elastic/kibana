/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import type { Transport, WorkloadClass } from './protocol';

const { IsolatedRunner, stopWorkloadClass } = (await import(
  new URL('./isolated_runner.ts', import.meta.url).href
)) as typeof import('./isolated_runner');

test('main execution: synchronous offender makes heartbeat visibly red', async (context) => {
  let previous = performance.now();
  let maximumGap = 0;
  const heartbeat = setInterval(() => {
    const now = performance.now();
    maximumGap = Math.max(maximumGap, now - previous);
    previous = now;
  }, 5);
  context.after(() => clearInterval(heartbeat));
  await delay(20);
  const started = performance.now();
  while (performance.now() - started < 200) {
    performance.now();
  }
  await delay(20);
  assert.ok(maximumGap >= 190, `red main heartbeat gap was only ${maximumGap}ms`);
  context.diagnostic(JSON.stringify({ transport: 'main', main_gap_ms: maximumGap }));
});

for (const transport of ['thread', 'process'] as const satisfies readonly Transport[]) {
  test(`${transport}: rejects stale completion and preserves generation`, async (context) => {
    const runner = new IsolatedRunner(transport, 'alerting');
    context.after(() => runner.stop());
    const first = await runner.run({ fixture: 'stale_first' });
    const second = await runner.run({ fixture: 'wait' });
    assert.equal(first.generation, 1);
    assert.equal(second.generation, 2);
    assert.equal(runner.staleResults, 1);
  });

  test(`${transport}: hard deadline stops non-cooperative execution, main survives`, async (context) => {
    const mainPid = process.pid;
    const runner = new IsolatedRunner(transport, 'workflow');
    context.after(() => runner.stop());
    await runner.ready;
    const started = performance.now();
    let maximumGap = 0;
    let previous = started;
    const heartbeat = setInterval(() => {
      const now = performance.now();
      maximumGap = Math.max(maximumGap, now - previous);
      previous = now;
    }, 5);
    context.after(() => clearInterval(heartbeat));
    await assert.rejects(
      runner.run({ fixture: 'infinite', deadlineMs: 1000 }),
      /Run deadline exceeded/
    );
    const duration = performance.now() - started;
    await runner.exited;
    assert.equal(runner.active, false);
    assert.equal(process.pid, mainPid);
    assert.ok(duration < 2000, `stop confirmation took ${duration}ms`);
    assert.ok(maximumGap < 500, `main heartbeat gap ${maximumGap}ms`);
    context.diagnostic(
      JSON.stringify({ transport, stop_ms: duration - 1000, main_gap_ms: maximumGap })
    );
  });

  test(`${transport}: produced bytes stay local; only small summary crosses`, async (context) => {
    const runner = new IsolatedRunner(transport, 'agent');
    context.after(() => runner.stop());
    const result = await runner.run({ fixture: 'bytes', bytes: 16 * 1024 * 1024 });
    assert.equal(result.consumedBytes, 16 * 1024 * 1024);
    assert.ok(runner.receivedBytes < 16384);
    assert.ok(runner.sentBytes < 16384);
  });

  test(`${transport}: class-wide kill has same-class collateral only`, async (context) => {
    const classes: readonly WorkloadClass[] = ['alerting', 'alerting', 'workflow', 'agent'];
    const runners = classes.map((workloadClass) => new IsolatedRunner(transport, workloadClass));
    context.after(() => Promise.all(runners.map((runner) => runner.stop())));
    await Promise.all(runners.map((runner) => runner.ready));
    const runs = runners.map((runner) =>
      runner.run({ fixture: 'wait', durationMs: 200, deadlineMs: 2000 })
    );
    // Observe rejections before requesting stop; unhandled rejection is a test failure.
    const settled = Promise.allSettled(runs);
    await delay(20);
    assert.equal(await stopWorkloadClass(runners, 'alerting'), 2);
    const results = await settled;
    assert.deepEqual(
      results.map(({ status }) => status),
      ['rejected', 'rejected', 'fulfilled', 'fulfilled']
    );
    context.diagnostic(
      JSON.stringify({ transport, selected_class: 'alerting', lost: 2, collateral: 1 })
    );
  });

  test(`${transport}: single-slot kill preserves same-class neighbour`, async (context) => {
    const runners = [0, 1].map(() => new IsolatedRunner(transport, 'alerting'));
    context.after(() => Promise.all(runners.map((runner) => runner.stop())));
    await Promise.all(runners.map((runner) => runner.ready));
    const runs = runners.map((runner) =>
      runner.run({ fixture: 'wait', durationMs: 100, deadlineMs: 2000 })
    );
    const settled = Promise.allSettled(runs);
    await delay(20);
    await runners[0].stop();
    const results = await settled;
    assert.deepEqual(
      results.map(({ status }) => status),
      ['rejected', 'fulfilled']
    );
  });
}
