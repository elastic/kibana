/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { performance } from 'node:perf_hooks';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import { mockLogger } from '../test_utils';
import type { ActivityTrackingConfig } from '../config';
import { ActivityTrackingMode } from '../config';
import {
  TaskActivityTracker,
  getTaskActivityRunFields,
  setActiveTaskActivityTracker,
} from './task_activity_tracker';

// A harness that faithfully reproduces core's AsyncLocalStorage-backed execution
// context (an IExecutionContextContainer with toJSON/toString), so the tracker's
// async_hooks attribution is exercised for real.
interface FakeContainer {
  toJSON: () => KibanaExecutionContext;
  toString: () => string;
}
const als = new AsyncLocalStorage<FakeContainer>();
const executionContext = { get: (): FakeContainer | undefined => als.getStore() };

const runInContext = <T>(ctx: KibanaExecutionContext, fn: () => Promise<T>): Promise<T> =>
  als.run({ toJSON: () => ctx, toString: () => JSON.stringify(ctx) }, fn);

// Mirrors what the task runner sets around `task.run()`.
const runTaskContext = <T>(id: string, taskType: string, fn: () => Promise<T>): Promise<T> =>
  runInContext({ type: 'task manager', name: `run ${taskType}`, description: 'run task', id }, fn);

const defaultConfig = (
  overrides: Partial<ActivityTrackingConfig> = {}
): ActivityTrackingConfig => ({
  enabled: true,
  mode: ActivityTrackingMode.Full,
  sample_rate: 1,
  task_types: [],
  sampler_interval: 30_000,
  dead_task_threshold: 60_000,
  ...overrides,
});

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Burns CPU in chunks separated by `await`, so each chunk after the first lands
// in a continuation callback the tracker can time (a cooperative CPU task).
const cpuTask = async (chunks: number, msPerChunk: number): Promise<void> => {
  for (let i = 0; i < chunks; i++) {
    const end = performance.now() + msPerChunk;
    while (performance.now() < end) {
      // burn CPU
    }
    await Promise.resolve();
  }
};

// Fires `ticks` short interval callbacks (a poll loop).
const pollTask = (ticks: number, intervalMs: number): Promise<void> =>
  new Promise<void>((resolve) => {
    let n = 0;
    const timer = setInterval(() => {
      if (++n >= ticks) {
        clearInterval(timer);
        resolve();
      }
    }, intervalMs);
  });

// Number of array elements whose allocation reliably grows the V8 heap by a few MB.
// (Arrays of doubles land on-heap; note `String.repeat` does NOT — V8 stores it
// compactly — so it can't be used to exercise heap accounting.)
const ALLOC_ELEMENTS_PER_CHUNK = 200_000;
// Conservative lower bound (bytes) for the heap growth of one such chunk.
const ALLOC_MIN_BYTES_PER_CHUNK = 1_000_000;

// Allocates a retained on-heap array per chunk. Each chunk is allocated *after* an
// `await`, so it lands in a continuation callback the tracker can attribute.
const allocTask = async (chunks: number): Promise<number[][]> => {
  const retained: number[][] = [];
  for (let i = 0; i < chunks; i++) {
    await Promise.resolve();
    retained.push(new Array(ALLOC_ELEMENTS_PER_CHUNK).fill(i + 0.5));
  }
  return retained;
};

// Blocks the event loop for ~`blockMs` in a single synchronous stretch. The block runs
// *after* one `await`, so it lands in a continuation callback the tracker can time.
const blockTask = async (blockMs: number): Promise<void> => {
  await Promise.resolve();
  const end = performance.now() + blockMs;
  while (performance.now() < end) {
    // burn CPU synchronously — nothing else can run on the loop.
  }
};

describe('TaskActivityTracker', () => {
  let tracker: TaskActivityTracker | undefined;

  afterEach(() => {
    tracker?.stop();
    tracker = undefined;
    setActiveTaskActivityTracker(undefined);
  });

  it('attributes on-CPU time for a cooperative CPU task (high active ratio)', async () => {
    tracker = new TaskActivityTracker({
      executionContext,
      logger: mockLogger(),
      config: defaultConfig(),
    });
    tracker.enable();

    const start = Date.now();
    await runTaskContext('cpu-1', 'cpu', () => cpuTask(12, 5));
    const wallMs = Date.now() - start;

    const fields = tracker.getRunFields('cpu-1', wallMs);
    expect(fields).toBeDefined();
    expect(fields!.active_ms).toBeGreaterThan(20);
    expect(fields!.callbacks).toBeGreaterThan(0);
    expect(fields!.active_ratio).toBeGreaterThan(0.5);
    expect(fields!.active_ratio).toBeLessThanOrEqual(1);
  });

  it('reports idle time for a sleeping task (≈0 active, idle ≈ wall)', async () => {
    tracker = new TaskActivityTracker({
      executionContext,
      logger: mockLogger(),
      config: defaultConfig(),
    });
    tracker.enable();

    const start = Date.now();
    await runTaskContext('sleep-1', 'sleep', () => delay(60));
    const wallMs = Date.now() - start;

    const fields = tracker.getRunFields('sleep-1', wallMs)!;
    expect(fields.active_ms).toBeLessThan(20);
    expect(fields.idle_ms).toBeGreaterThan(30);
    expect(fields.active_ratio).toBeLessThan(0.3);
    // the single stretch with no on-CPU work should approximate the sleep.
    expect(fields.longest_idle_gap_ms).toBeGreaterThan(30);
  });

  it('counts many callbacks with low active time for a poll loop', async () => {
    tracker = new TaskActivityTracker({
      executionContext,
      logger: mockLogger(),
      config: defaultConfig(),
    });
    tracker.enable();

    const start = Date.now();
    await runTaskContext('poll-1', 'poll', () => pollTask(5, 20));
    const wallMs = Date.now() - start;

    const fields = tracker.getRunFields('poll-1', wallMs)!;
    expect(fields.callbacks).toBeGreaterThanOrEqual(5);
    expect(fields.active_ms).toBeLessThan(20);
    expect(fields.longest_idle_gap_ms).toBeGreaterThanOrEqual(10);
    // each poll tick does trivial work, so it never blocks the loop for long.
    expect(fields.longest_event_loop_block_ms).toBeLessThan(15);
  });

  it('reports the longest single event-loop block for a task', async () => {
    tracker = new TaskActivityTracker({
      executionContext,
      logger: mockLogger(),
      config: defaultConfig(),
    });
    tracker.enable();

    await runTaskContext('block-1', 'blocking', () => blockTask(40));

    const fields = tracker.getRunFields('block-1', 60)!;
    // one ~40ms synchronous stretch blocked the loop.
    expect(fields.longest_event_loop_block_ms).toBeGreaterThan(25);
    // a single block can never exceed the total on-CPU time.
    expect(fields.longest_event_loop_block_ms).toBeLessThanOrEqual(fields.active_ms);
  });

  it('isolates active time between a heavy task and an idle neighbor', async () => {
    tracker = new TaskActivityTracker({
      executionContext,
      logger: mockLogger(),
      config: defaultConfig(),
    });
    tracker.enable();

    const start = Date.now();
    await Promise.all([
      runTaskContext('heavy', 'cpu', () => cpuTask(15, 5)),
      runTaskContext('idle', 'sleep', () => delay(70)),
    ]);
    const wallMs = Date.now() - start;

    const heavy = tracker.getRunFields('heavy', wallMs)!;
    const idle = tracker.getRunFields('idle', wallMs)!;

    expect(heavy.active_ms).toBeGreaterThan(20);
    // the idle task stays ≈0 on-CPU regardless of the CPU-heavy neighbor.
    expect(idle.active_ms).toBeLessThan(20);
    expect(idle.active_ratio).toBeLessThan(0.3);
  });

  it('reports the peak per-callback heap allocation for a task', async () => {
    tracker = new TaskActivityTracker({
      executionContext,
      logger: mockLogger(),
      config: defaultConfig(),
    });
    tracker.enable();

    await runTaskContext('alloc-1', 'alloc', () => allocTask(6));

    const fields = tracker.getRunFields('alloc-1', 50)!;
    // at least one single callback allocated ≈ one multi-MB chunk.
    expect(fields.max_memory_per_callback_bytes).toBeGreaterThan(ALLOC_MIN_BYTES_PER_CHUNK);
  });

  it('isolates per-callback heap allocation between an allocating task and an idle neighbor', async () => {
    tracker = new TaskActivityTracker({
      executionContext,
      logger: mockLogger(),
      config: defaultConfig(),
    });
    tracker.enable();

    await Promise.all([
      runTaskContext('mem-heavy', 'alloc', () => allocTask(6)),
      runTaskContext('mem-idle', 'sleep', () => delay(80)),
    ]);

    const heavy = tracker.getRunFields('mem-heavy', 90)!;
    const idle = tracker.getRunFields('mem-idle', 90)!;

    expect(heavy.max_memory_per_callback_bytes).toBeGreaterThan(ALLOC_MIN_BYTES_PER_CHUNK);
    // the idle task allocates ≈nothing on-CPU, regardless of the heavy neighbor's churn.
    expect(idle.max_memory_per_callback_bytes).toBeLessThan(ALLOC_MIN_BYTES_PER_CHUNK);
  });

  it('does not attribute task-store contexts (no "run task" description)', async () => {
    tracker = new TaskActivityTracker({
      executionContext,
      logger: mockLogger(),
      config: defaultConfig(),
    });
    tracker.enable();

    // task-store ops are tagged type:'task manager' but name:'taskStore'/id:'get'.
    await runInContext({ type: 'task manager', name: 'taskStore', id: 'get' }, () => delay(20));

    expect(tracker.getRunFields('get', 20)).toBeUndefined();
  });

  it('does not attribute non-task execution contexts', async () => {
    tracker = new TaskActivityTracker({
      executionContext,
      logger: mockLogger(),
      config: defaultConfig(),
    });
    tracker.enable();

    await runInContext({ type: 'application', name: 'lens', id: 'abc' }, () => delay(20));

    expect(tracker.getRunFields('abc', 20)).toBeUndefined();
  });

  it('respects the task_types allowlist', async () => {
    tracker = new TaskActivityTracker({
      executionContext,
      logger: mockLogger(),
      config: defaultConfig({ task_types: ['allowed'] }),
    });
    tracker.enable();

    await runTaskContext('a1', 'allowed', () => cpuTask(6, 3));
    await runTaskContext('b1', 'blocked', () => cpuTask(6, 3));

    expect(tracker.getRunFields('a1', 30)).toBeDefined();
    expect(tracker.getRunFields('b1', 30)).toBeUndefined();
  });

  it('is a no-op when disabled or mode is "off"', async () => {
    tracker = new TaskActivityTracker({
      executionContext,
      logger: mockLogger(),
      config: defaultConfig({ enabled: false }),
    });
    tracker.enable();
    expect(tracker.isEnabled).toBe(false);
    await runTaskContext('x', 'cpu', () => cpuTask(4, 3));
    expect(tracker.getRunFields('x', 20)).toBeUndefined();
    tracker.stop();

    tracker = new TaskActivityTracker({
      executionContext,
      logger: mockLogger(),
      config: defaultConfig({ mode: ActivityTrackingMode.Off }),
    });
    tracker.enable();
    expect(tracker.isEnabled).toBe(false);
    await runTaskContext('y', 'cpu', () => cpuTask(4, 3));
    expect(tracker.getRunFields('y', 20)).toBeUndefined();
  });

  it('sampled mode honors sample_rate', async () => {
    tracker = new TaskActivityTracker({
      executionContext,
      logger: mockLogger(),
      config: defaultConfig({ mode: ActivityTrackingMode.Sampled, sample_rate: 0 }),
    });
    tracker.enable();
    await runTaskContext('s0', 'cpu', () => cpuTask(4, 3));
    expect(tracker.getRunFields('s0', 20)).toBeUndefined();
    tracker.stop();

    tracker = new TaskActivityTracker({
      executionContext,
      logger: mockLogger(),
      config: defaultConfig({ mode: ActivityTrackingMode.Sampled, sample_rate: 1 }),
    });
    tracker.enable();
    await runTaskContext('s1', 'cpu', () => cpuTask(4, 3));
    expect(tracker.getRunFields('s1', 20)).toBeDefined();
  });

  it('resets accounting for a recurring task id after the previous run completed', async () => {
    tracker = new TaskActivityTracker({
      executionContext,
      logger: mockLogger(),
      config: defaultConfig(),
    });
    tracker.enable();

    await runTaskContext('recurring', 'cpu', () => cpuTask(10, 4));
    const first = tracker.getRunFields('recurring', 40)!;
    expect(first.active_ms).toBeGreaterThan(15);

    // a second run of the same id that is mostly idle must not inherit the first run's active time.
    await runTaskContext('recurring', 'cpu', () => delay(40));
    const second = tracker.getRunFields('recurring', 40)!;
    expect(second.active_ms).toBeLessThan(20);
    expect(second.active_ms).toBeLessThan(first.active_ms);
  });

  it('warns about an in-flight task holding a worker slot while doing ~0 work', async () => {
    const logger = mockLogger();
    tracker = new TaskActivityTracker({
      executionContext,
      logger,
      config: defaultConfig({ sampler_interval: 30, dead_task_threshold: 20 }),
    });
    tracker.enable();

    let release: () => void = () => {};
    // an in-flight run that creates an async resource (live > 0) but never does work.
    const running = runTaskContext(
      'stuck',
      'blocking',
      () =>
        new Promise<void>((resolve) => {
          // a lingering timer keeps a resource alive so `live > 0`.
          const timer = setTimeout(() => {}, 10_000);
          release = () => {
            clearTimeout(timer);
            resolve();
          };
        })
    );

    // let a couple of sampler ticks run.
    await delay(90);

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('appears stuck'));

    release();
    await running;
  });
});

describe('getTaskActivityRunFields', () => {
  afterEach(() => setActiveTaskActivityTracker(undefined));

  it('returns undefined when no tracker is registered', () => {
    setActiveTaskActivityTracker(undefined);
    expect(getTaskActivityRunFields('anything', 100)).toBeUndefined();
  });

  it('delegates to the registered tracker', async () => {
    const tracker = new TaskActivityTracker({
      executionContext,
      logger: mockLogger(),
      config: defaultConfig(),
    });
    tracker.enable();
    setActiveTaskActivityTracker(tracker);

    await runTaskContext('m1', 'cpu', () => cpuTask(6, 3));
    expect(getTaskActivityRunFields('m1', 30)).toBeDefined();

    tracker.stop();
  });
});
