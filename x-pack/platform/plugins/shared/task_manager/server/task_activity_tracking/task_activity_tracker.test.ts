/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AsyncLocalStorage, AsyncResource, createHook } from 'node:async_hooks';
import { readFile } from 'node:fs';
import { performance } from 'node:perf_hooks';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import { mockLogger } from '../test_utils';
import type { ActivityTrackingConfig } from '../config';
import {
  TaskActivityTracker,
  beginTaskActivityRun,
  getTaskActivityRunFields,
  runTaskWithActivityTracking,
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

const defaultConfig = (
  overrides: Partial<ActivityTrackingConfig> = {}
): ActivityTrackingConfig => ({
  enabled: true,
  track_heap_growth: false,
  ...overrides,
});

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type CallbackScheduler = (callback: () => void) => void;
const callbackSchedulers: Array<[name: string, schedule: CallbackScheduler]> = [
  ['promise', (callback) => void Promise.resolve().then(callback)],
  ['queueMicrotask', (callback) => queueMicrotask(callback)],
  ['nextTick', (callback) => process.nextTick(callback)],
  ['immediate', (callback) => setImmediate(callback)],
  ['timer', (callback) => setTimeout(callback, 0)],
  ['file-system', (callback) => readFile(__filename, callback)],
];

/**
 * Mirrors what the task runner does around `task.run()`: announce the run, enter the
 * execution context, and time the synchronous part of `run()` at the call site.
 * `deferred` mirrors the microtask hop `withSpan` adds when APM is started, which moves
 * that synchronous part into a callback the tracker already times.
 */
const runTask = async <T>(
  tracker: TaskActivityTracker,
  { id, taskType, deferred = false }: { id: string; taskType: string; deferred?: boolean },
  run: () => Promise<T>
): Promise<number> => {
  tracker.beginRun(id, taskType);
  const start = Date.now();
  await runInContext(
    { type: 'task manager', name: `run ${taskType}`, description: 'run task', id },
    async () => {
      if (deferred) await Promise.resolve();
      return tracker.runSyncSection(id, run);
    }
  );
  return Date.now() - start;
};

const burnCpu = (ms: number): void => {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    // burn CPU synchronously — nothing else can run on the loop.
  }
};

// Burns CPU in chunks separated by `await`, so each chunk after the first lands
// in a continuation callback the tracker can time (a cooperative CPU task).
const cpuTask = async (chunks: number, msPerChunk: number): Promise<void> => {
  for (let i = 0; i < chunks; i++) {
    burnCpu(msPerChunk);
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

const ALLOC_ELEMENTS_PER_CHUNK = 200_000;
const ALLOC_MIN_BYTES_PER_CHUNK = 1_000_000;

// Retain each allocation so normal reclamation cannot erase it before the callback ends.
const allocateHeapAfterYield = async (chunks: number): Promise<number[][]> => {
  const retained: number[][] = [];
  for (let i = 0; i < chunks; i++) {
    await Promise.resolve();
    retained.push(new Array(ALLOC_ELEMENTS_PER_CHUNK).fill(i + 0.5));
  }
  return retained;
};

// Blocks the event loop for ~`blockMs` in a single synchronous stretch, *after* one
// `await`, so it lands in a continuation callback the tracker can time.
const blockTask = async (blockMs: number): Promise<void> => {
  await Promise.resolve();
  burnCpu(blockMs);
};

/**
 * Blocks for `outerMs + innerMs + outerMs` in one uninterrupted stretch, with the middle
 * portion running inside a nested async resource — the shape Node's own stream and http
 * internals produce, and the one that hides blocking if nested `before`/`after` pairs
 * are mistaken for separate callbacks.
 */
const nestedBlockTask = async (outerMs: number, innerMs: number, depth = 1): Promise<void> => {
  await Promise.resolve();
  const resources = Array.from({ length: depth }, (_, i) => new AsyncResource(`test-nested-${i}`));
  const runNested = (level: number): void => {
    if (level >= depth) {
      burnCpu(innerMs);
      return;
    }
    resources[level].runInAsyncScope(() => runNested(level + 1));
  };
  burnCpu(outerMs);
  runNested(0);
  burnCpu(outerMs);
  resources.forEach((resource) => resource.emitDestroy());
};

/**
 * Ground truth for "did the loop actually block": a 1ms heartbeat. A real block of N ms
 * shows up as an N ms gap between consecutive fires, no matter how the accounting
 * attributes it.
 */
const withHeartbeat = async <T>(fn: () => Promise<T>): Promise<{ result: T; maxGapMs: number }> => {
  const fires: number[] = [];
  const timer = setInterval(() => fires.push(performance.now()), 1);
  try {
    // Ensure there is a fire immediately before the work. Otherwise a synchronous
    // prefix can finish before the interval fires for the first time, leaving no pair
    // of timestamps around the block from which to calculate a gap.
    await delay(15);
    const result = await fn();
    // let one more heartbeat land so a trailing block is observable.
    await delay(15);
    let maxGapMs = 0;
    for (let i = 1; i < fires.length; i++) {
      maxGapMs = Math.max(maxGapMs, fires[i] - fires[i - 1]);
    }
    return { result, maxGapMs };
  } finally {
    clearInterval(timer);
  }
};

// These tests intentionally exercise the real Node runtime without mocking async_hooks.
// They turn assumptions the tracker relies on into canaries for Node upgrades.
describe('Node async_hooks compatibility contract', () => {
  it('ends a callback bracket before its returned promise settles', async () => {
    const resource = new AsyncResource('node-upgrade-async-callback');
    const asyncId = resource.asyncId();
    let beforeAt = -1;
    let afterAt = -1;
    let completedAt = -1;
    const hook = createHook({
      before: (id) => {
        if (id === asyncId) beforeAt = performance.now();
      },
      after: (id) => {
        if (id === asyncId) afterAt = performance.now();
      },
    });

    hook.enable();
    try {
      await resource.runInAsyncScope(async () => {
        await delay(80);
        completedAt = performance.now();
      });
    } finally {
      hook.disable();
      resource.emitDestroy();
    }

    const callbackDuration = afterAt - beforeAt;
    const asyncLifetime = completedAt - beforeAt;
    expect(beforeAt).toBeGreaterThanOrEqual(0);
    expect(afterAt).toBeGreaterThanOrEqual(beforeAt);
    expect(asyncLifetime).toBeGreaterThan(60);
    // The false positive from the slides would make these durations approximately equal.
    expect(callbackDuration).toBeLessThan(asyncLifetime / 2);
  });

  it('emits after when a callback throws', () => {
    const resource = new AsyncResource('node-upgrade-throwing-callback');
    const asyncId = resource.asyncId();
    let beforeCount = 0;
    let afterCount = 0;
    const hook = createHook({
      before: (id) => {
        if (id === asyncId) beforeCount++;
      },
      after: (id) => {
        if (id === asyncId) afterCount++;
      },
    });

    hook.enable();
    try {
      expect(() =>
        resource.runInAsyncScope(() => {
          throw new Error('expected test error');
        })
      ).toThrow('expected test error');
    } finally {
      hook.disable();
      resource.emitDestroy();
    }

    expect(beforeCount).toBe(1);
    expect(afterCount).toBe(1);
  });
});

describe('TaskActivityTracker', () => {
  let tracker: TaskActivityTracker | undefined;

  const createTracker = (
    overrides: Partial<ActivityTrackingConfig> = {},
    logger = mockLogger(),
    timing?: { samplerIntervalMs?: number; deadTaskThresholdMs?: number }
  ) => {
    tracker = new TaskActivityTracker({
      executionContext,
      logger,
      config: defaultConfig(overrides),
      timing,
    });
    tracker.enable();
    return tracker;
  };

  afterEach(() => {
    tracker?.stop();
    tracker = undefined;
    setActiveTaskActivityTracker(undefined);
  });

  it('attributes on-CPU time for a cooperative CPU task (high active ratio)', async () => {
    createTracker();

    const wallMs = await runTask(tracker!, { id: 'cpu-1', taskType: 'cpu' }, () => cpuTask(12, 5));

    const fields = tracker!.getRunFields('cpu-1', wallMs);
    expect(fields).toBeDefined();
    expect(fields!.active_ms).toBeGreaterThan(20);
    expect(fields!.callbacks).toBeGreaterThan(0);
    expect(fields!.active_ratio).toBeGreaterThan(0.5);
    expect(fields!.active_ratio).toBeLessThanOrEqual(1);
    expect(fields!.process_cpu_ms).toBeGreaterThan(20);
    expect(fields!.unattributed_cpu_ms).toBeGreaterThanOrEqual(0);
  });

  it('does not count time awaiting a timer as callback execution', async () => {
    createTracker();

    const wallMs = await runTask(tracker!, { id: 'sleep-1', taskType: 'sleep' }, async () => {
      await delay(100);
    });

    const fields = tracker!.getRunFields('sleep-1', wallMs)!;
    expect(fields.active_ms).toBeLessThan(30);
    expect(fields.idle_ms).toBeGreaterThan(60);
    expect(fields.active_ratio).toBeLessThan(0.3);
    expect(fields.longest_idle_gap_ms).toBeGreaterThan(60);
    // A before/after bracket spanning the wait (the slides' false positive) would be ~100ms.
    expect(fields.longest_event_loop_block_ms).toBeLessThan(30);
  });

  it.each(callbackSchedulers)(
    'attributes blocking work in Node %s callbacks',
    async (name, schedule) => {
      createTracker();

      const wallMs = await runTask(
        tracker!,
        { id: `resource-${name}`, taskType: 'runtime-contract' },
        () =>
          new Promise<void>((resolve) => {
            schedule(() => {
              burnCpu(20);
              resolve();
            });
          })
      );

      const fields = tracker!.getRunFields(`resource-${name}`, wallMs)!;
      expect(fields.callbacks).toBeGreaterThan(0);
      expect(fields.active_ms).toBeGreaterThan(12);
      expect(fields.longest_event_loop_block_ms).toBeGreaterThan(12);
    }
  );

  it('counts many callbacks with low active time for a poll loop', async () => {
    createTracker();

    const wallMs = await runTask(tracker!, { id: 'poll-1', taskType: 'poll' }, () =>
      pollTask(5, 20)
    );

    const fields = tracker!.getRunFields('poll-1', wallMs)!;
    expect(fields.callbacks).toBeGreaterThanOrEqual(5);
    expect(fields.active_ms).toBeLessThan(20);
    expect(fields.longest_idle_gap_ms).toBeGreaterThanOrEqual(10);
    // each poll tick does trivial work, so it never blocks the loop for long.
    expect(fields.longest_event_loop_block_ms).toBeLessThan(15);
  });

  it('reports the longest single event-loop block for a task', async () => {
    createTracker();

    const { maxGapMs } = await withHeartbeat(() =>
      runTask(tracker!, { id: 'block-1', taskType: 'blocking' }, () => blockTask(60))
    );

    const fields = tracker!.getRunFields('block-1', 80)!;
    // the reported block must match what the loop actually experienced.
    expect(maxGapMs).toBeGreaterThan(45);
    expect(fields.longest_event_loop_block_ms).toBeGreaterThan(45);
    expect(fields.longest_event_loop_block_ms).toBeLessThanOrEqual(Math.ceil(maxGapMs) + 15);
    // a single block can never exceed the total on-CPU time.
    expect(fields.longest_event_loop_block_ms).toBeLessThanOrEqual(fields.active_ms);
  });

  it('reports the whole uninterrupted block when a callback nests another callback', async () => {
    createTracker();

    const { maxGapMs } = await withHeartbeat(() =>
      runTask(tracker!, { id: 'nested-1', taskType: 'blocking' }, () => nestedBlockTask(40, 40))
    );

    const fields = tracker!.getRunFields('nested-1', 140)!;
    // 40 + 40 + 40 ran back to back with no chance for the loop to advance.
    expect(maxGapMs).toBeGreaterThan(90);
    expect(fields.longest_event_loop_block_ms).toBeGreaterThan(90);
    expect(fields.longest_event_loop_block_ms).toBeLessThanOrEqual(Math.ceil(maxGapMs) + 20);
    // the nested callback must not be billed on top of the outer one.
    expect(fields.active_ms).toBeLessThan(Math.ceil(maxGapMs) + 40);
  });

  it('reports the whole uninterrupted block with deeply nested callbacks', async () => {
    createTracker();

    const { maxGapMs } = await withHeartbeat(() =>
      runTask(tracker!, { id: 'nested-2', taskType: 'blocking' }, () => nestedBlockTask(30, 30, 3))
    );

    const fields = tracker!.getRunFields('nested-2', 120)!;
    expect(maxGapMs).toBeGreaterThan(70);
    expect(fields.longest_event_loop_block_ms).toBeGreaterThan(70);
    expect(fields.longest_event_loop_block_ms).toBeLessThanOrEqual(Math.ceil(maxGapMs) + 20);
  });

  it('does not bill the same nested work to two tasks', async () => {
    createTracker();

    let shared: AsyncResource | undefined;
    const wallB = await runTask(tracker!, { id: 'x-b', taskType: 'listener' }, async () => {
      await Promise.resolve();
      shared = new AsyncResource('test-shared-listener');
    });

    // taskA synchronously runs a callback that belongs to taskB (a shared listener).
    const wallA = await runTask(tracker!, { id: 'x-a', taskType: 'blocking' }, async () => {
      await Promise.resolve();
      burnCpu(40);
      shared!.runInAsyncScope(() => burnCpu(40));
      burnCpu(40);
    });
    shared!.emitDestroy();

    const a = tracker!.getRunFields('x-a', wallA)!;
    const b = tracker!.getRunFields('x-b', wallB)!;

    // the loop was busy for ~120ms in total; billing both tasks would report ~160ms.
    expect(a.active_ms + b.active_ms).toBeLessThan(150);
    // the task whose callback was on the stack owns the block.
    expect(a.longest_event_loop_block_ms).toBeGreaterThan(90);
    expect(b.active_ms).toBeLessThan(30);
  });

  it('attributes work that runs before the task first yields', async () => {
    createTracker();

    const { result: wallMs, maxGapMs } = await withHeartbeat(() =>
      // no `await` before the CPU work: it runs in the caller's callback.
      runTask(tracker!, { id: 'sync-1', taskType: 'sync' }, async () => {
        burnCpu(60);
      })
    );

    const fields = tracker!.getRunFields('sync-1', wallMs)!;
    expect(maxGapMs).toBeGreaterThan(45);
    expect(fields.sync_ms).toBeGreaterThan(45);
    expect(fields.active_ms).toBeGreaterThan(45);
    expect(fields.longest_event_loop_block_ms).toBeGreaterThan(45);
    // a CPU-bound task must not look idle.
    expect(fields.active_ratio).toBeGreaterThan(0.5);
  });

  it('does not double count synchronous work already covered by a callback', async () => {
    createTracker();

    // `deferred` puts the synchronous part of run() inside a callback owned by the run,
    // exactly like withSpan does when APM is started.
    const wallMs = await runTask(
      tracker!,
      { id: 'sync-2', taskType: 'sync', deferred: true },
      async () => {
        burnCpu(60);
      }
    );

    const fields = tracker!.getRunFields('sync-2', wallMs)!;
    expect(fields.sync_ms).toBeGreaterThan(45);
    expect(fields.active_ms).toBeGreaterThan(45);
    // ~60ms of work, counted once.
    expect(fields.active_ms).toBeLessThan(110);
  });

  it('does not double count nested callbacks in the synchronous prefix', async () => {
    createTracker();

    const wallMs = await runTask(tracker!, { id: 'sync-nested', taskType: 'sync' }, async () => {
      const resource = new AsyncResource('test-sync-nested');
      burnCpu(30);
      resource.runInAsyncScope(() => burnCpu(30));
      burnCpu(30);
      resource.emitDestroy();
    });

    const fields = tracker!.getRunFields('sync-nested', wallMs)!;
    expect(fields.sync_ms).toBeGreaterThan(70);
    expect(fields.longest_event_loop_block_ms).toBeGreaterThan(70);
    // The nested 30ms callback is already inside the 90ms synchronous prefix.
    expect(fields.active_ms).toBeLessThan(125);
  });

  it('isolates active time between a heavy task and an idle neighbor', async () => {
    createTracker();

    const walls = await Promise.all([
      runTask(tracker!, { id: 'heavy', taskType: 'cpu' }, () => cpuTask(15, 5)),
      runTask(tracker!, { id: 'idle', taskType: 'sleep' }, () => delay(90)),
    ]);

    const heavy = tracker!.getRunFields('heavy', walls[0])!;
    const idle = tracker!.getRunFields('idle', walls[1])!;

    expect(heavy.active_ms).toBeGreaterThan(20);
    // the idle task stays ≈0 on-CPU regardless of the CPU-heavy neighbor.
    expect(idle.active_ms).toBeLessThan(20);
    expect(idle.active_ratio).toBeLessThan(0.3);
  });

  it('surfaces the process-wide event-loop delay maximum and what it could not attribute', async () => {
    createTracker();

    const wallMs = await runTask(tracker!, { id: 'eld-1', taskType: 'sleep' }, () => delay(30));

    const fields = tracker!.getRunFields('eld-1', wallMs, 120)!;
    expect(fields.event_loop_delay_max_ms).toBe(120);
    expect(fields.unattributed_block_ms).toBe(120 - fields.longest_event_loop_block_ms);
  });

  it('omits heap growth when the measurement is disabled', async () => {
    createTracker();

    const wallMs = await runTask(tracker!, { id: 'heap-off', taskType: 'alloc' }, () =>
      allocateHeapAfterYield(2)
    );

    expect(tracker!.getRunFields('heap-off', wallMs)!.max_heap_growth_per_callback_bytes).toBe(
      undefined
    );
  });

  it('reports peak per-callback V8 heap growth when enabled', async () => {
    createTracker({ track_heap_growth: true });

    const wallMs = await runTask(tracker!, { id: 'heap-on', taskType: 'alloc' }, () =>
      allocateHeapAfterYield(6)
    );

    expect(
      tracker!.getRunFields('heap-on', wallMs)!.max_heap_growth_per_callback_bytes
    ).toBeGreaterThan(ALLOC_MIN_BYTES_PER_CHUNK);
  });

  it('does not attribute task-store contexts (no "run task" description)', async () => {
    createTracker();

    // task-store ops are tagged type:'task manager' but name:'taskStore'/id:'get'.
    await runInContext({ type: 'task manager', name: 'taskStore', id: 'get' }, () => delay(20));

    expect(tracker!.getRunFields('get', 20)).toBeUndefined();
  });

  it('does not attribute non-task execution contexts', async () => {
    createTracker();

    await runInContext({ type: 'application', name: 'lens', id: 'abc' }, () => delay(20));

    expect(tracker!.getRunFields('abc', 20)).toBeUndefined();
  });

  it('is a no-op when disabled', async () => {
    createTracker({ enabled: false });
    expect(tracker!.isEnabled).toBe(false);
    const wallMs = await runTask(tracker!, { id: 'x', taskType: 'cpu' }, () => cpuTask(4, 3));
    expect(tracker!.getRunFields('x', wallMs)).toBeUndefined();
  });

  it('resets accounting for a recurring task id after the previous run completed', async () => {
    createTracker();

    const firstWall = await runTask(tracker!, { id: 'recurring', taskType: 'cpu' }, () =>
      cpuTask(10, 4)
    );
    const first = tracker!.getRunFields('recurring', firstWall)!;
    expect(first.active_ms).toBeGreaterThan(15);

    // a second run of the same id that is mostly idle must not inherit the first run's active time.
    const secondWall = await runTask(tracker!, { id: 'recurring', taskType: 'cpu' }, () =>
      delay(40)
    );
    const second = tracker!.getRunFields('recurring', secondWall)!;
    expect(second.active_ms).toBeLessThan(20);
    expect(second.active_ms).toBeLessThan(first.active_ms);
  });

  it('does not bill a new run for callbacks left behind by the previous run', async () => {
    createTracker();

    // the first run leaves a timer behind that fires (and blocks) during the second run.
    const firstWall = await runTask(tracker!, { id: 'leaky', taskType: 'cpu' }, async () => {
      setTimeout(() => burnCpu(50), 30);
    });
    tracker!.getRunFields('leaky', firstWall);

    const secondWall = await runTask(tracker!, { id: 'leaky', taskType: 'cpu' }, () => delay(120));

    const second = tracker!.getRunFields('leaky', secondWall)!;
    expect(second.active_ms).toBeLessThan(25);
  });

  it('warns about an in-flight task holding a worker slot while doing ~0 work', async () => {
    const logger = mockLogger();
    createTracker({}, logger, { samplerIntervalMs: 30, deadTaskThresholdMs: 20 });

    let release: () => void = () => {};
    // an in-flight run that creates an async resource (live > 0) but never does work.
    tracker!.beginRun('stuck', 'blocking');
    const running = runInContext(
      { type: 'task manager', name: 'run blocking', description: 'run task', id: 'stuck' },
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

describe('module-level accessors', () => {
  afterEach(() => setActiveTaskActivityTracker(undefined));

  it('are no-ops when no tracker is registered', () => {
    setActiveTaskActivityTracker(undefined);
    expect(() => beginTaskActivityRun('anything', 'cpu')).not.toThrow();
    expect(runTaskWithActivityTracking('anything', () => 42)).toBe(42);
    expect(getTaskActivityRunFields('anything', 100)).toBeUndefined();
  });

  it('delegate to the registered tracker', async () => {
    const tracker = new TaskActivityTracker({
      executionContext,
      logger: mockLogger(),
      config: defaultConfig(),
    });
    tracker.enable();
    setActiveTaskActivityTracker(tracker);

    beginTaskActivityRun('m1', 'cpu');
    const start = Date.now();
    await runInContext(
      { type: 'task manager', name: 'run cpu', description: 'run task', id: 'm1' },
      () => runTaskWithActivityTracking('m1', () => cpuTask(6, 3))
    );

    const fields = getTaskActivityRunFields('m1', Date.now() - start, 50);
    expect(fields).toBeDefined();
    expect(fields!.event_loop_delay_max_ms).toBe(50);

    tracker.stop();
  });
});
