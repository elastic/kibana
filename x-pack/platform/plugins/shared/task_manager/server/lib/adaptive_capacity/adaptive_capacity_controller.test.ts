/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { RunningTaskSnapshot } from '../../task_pool';
import type { AdaptiveCapacitySettings } from './adaptive_capacity_controller';
import { AdaptiveCapacityController, readMaxOldSpaceBytes } from './adaptive_capacity_controller';
import { TaskMemoryEstimator } from './task_memory_estimator';

const MB = 1024 * 1024;
const LIMIT = 2048 * MB;

const settings: AdaptiveCapacitySettings = {
  minCapacity: 2,
  maxCapacity: 50,
  heapTargetRatio: 0.75, // 1536 MB
  defaultBytesPerTask: 100 * MB,
  maxIncreasePerDecision: 5,
  lightTaskBytes: 0,
  lightTaskSlots: 0,
  decisionIntervalMs: 1000,
  memoryTargetRatio: 0.85,
};

const task = (executionId: string, taskType = 't', cost = 2): RunningTaskSnapshot => ({
  executionId,
  taskId: `task-${executionId}`,
  taskType,
  cost,
});

const setup = (
  opts: {
    estimator?: TaskMemoryEstimator;
    settings?: Partial<AdaptiveCapacitySettings>;
    constrainedMemory?: number;
  } = {}
) => {
  let usedHeapBytes = 1000 * MB;
  let externalBytes = 0;
  let rssBytes = 1200 * MB;
  let running: RunningTaskSnapshot[] = [];
  let majorGc = () => {};
  const unobserve = jest.fn();
  const getRssBytes = jest.fn(() => rssBytes);
  const controller = new AdaptiveCapacityController({
    logger: loggingSystemMock.createLogger(),
    settings: { ...settings, ...opts.settings },
    getHeapStats: () => ({ usedHeapBytes, externalBytes, heapLimitBytes: LIMIT }),
    // The test host may itself run in a container; never let its limit leak in.
    getConstrainedMemory: () => opts.constrainedMemory ?? 0,
    getRssBytes,
    getRunningTasks: () => running,
    estimator: opts.estimator,
    observeMajorGc: (onMajorGc) => {
      majorGc = onMajorGc;
      return unobserve;
    },
  });
  return {
    controller,
    majorGc: () => majorGc(),
    unobserve,
    setHeap: (mb: number) => (usedHeapBytes = mb * MB),
    setExternal: (mb: number) => (externalBytes = mb * MB),
    setRss: (mb: number) => (rssBytes = mb * MB),
    getRssBytes,
    setRunning: (tasks: RunningTaskSnapshot[]) => (running = tasks),
  };
};

describe('AdaptiveCapacityController', () => {
  it('reports a run from the runner once and ignores the pool notification that follows', () => {
    const { controller, setHeap, setRunning } = setup();
    setRunning([task('a')]);
    controller.tick();
    setHeap(1100);
    expect(controller.observeRunEnd(task('a'))).toEqual({
      bytes: 100 * MB,
      instanceBytes: 100 * MB,
      samples: 1,
    });
    setRunning([]);
    setHeap(1150);
    controller.taskEnded(task('a'));
    expect(controller.observeRunEnd(task('a'))).toBeUndefined();
    controller.refresh('tick');
    expect(controller.state.estimates[0]).toEqual({
      task_type: 't',
      bytes_per_cost_unit: 50 * MB,
      heap_share: 1,
      samples: 1,
    });
  });

  it('seeds the claim gate from a document estimate and counts it in the state', () => {
    const { controller } = setup();
    const gate = controller.memoryGate();
    const estimate = { bytes: 30 * MB, samples: 2, updatedAt: '2026-11-05T00:00:00.000Z' };
    expect(gate.seed('task-x', 't', 2, estimate)).toBe(true);
    expect(gate.seed('task-x', 't', 2, estimate)).toBe(false);
    expect(gate.estimateBytes('task-x', 't', 2)).toBe(30 * MB);
    controller.refresh('tick');
    expect(controller.state.seeded_instances).toBe(1);
  });

  it('starts from the minimum and steps up by at most maxIncreasePerDecision', () => {
    const { controller } = setup();
    // budget 536 MB / 100 MB per task = 5 free slots, capped by +5 per decision from min 2
    expect(controller.state.free_slots).toBe(5);
    expect(controller.state.capacity).toBe(5);
    expect(controller.refresh('tick')).toBe(5);
  });

  it('keeps room for the tasks already running', () => {
    const { controller, setRunning } = setup();
    setRunning([task('a'), task('b')]);
    controller.refresh('claim');
    // projected = baseline 1000 + 2 * 100 MB = 1200; budget 336 MB -> 3 free + 2 running
    expect(controller.state.heap_projected_bytes).toBe(1200 * MB);
    expect(controller.state.capacity).toBe(5);
  });

  it('drops to the running set when the heap is above target, never below min', () => {
    const { controller, setHeap, setRunning } = setup();
    setRunning([task('a')]);
    setHeap(1700);
    expect(controller.refresh('claim')).toBe(settings.minCapacity);
    expect(controller.state.heap_budget_bytes).toBeLessThan(0);
    expect(controller.state.free_slots).toBe(0);
  });

  it('uses learned per-type estimates and recovers once the heap is released', () => {
    const estimator = new TaskMemoryEstimator({ defaultBytesPerTask: 100 * MB });
    const { controller, setHeap, setRunning } = setup({ estimator });
    const tasks = [1, 2, 3, 4].map((i) => task(`${i}`, 'heavy'));
    setRunning(tasks);
    controller.tick();
    setHeap(1400); // +400 MB while 4 tasks ran -> 50 MB per cost unit, 100 MB per task
    controller.tick();
    setRunning([]);
    controller.tick();
    expect(estimator.estimateBytes('task-1', 'heavy', 2)).toBe(100 * MB);

    // heap still holds garbage: projected = max(1400, baseline) -> 136 MB budget -> 1 slot, min applies
    expect(controller.state.capacity).toBe(settings.minCapacity);
    setHeap(1000);
    controller.tick();
    // baseline drifts down from 1400 towards 1000, so the budget opens gradually
    expect(controller.state.capacity).toBeGreaterThan(settings.minCapacity);
    expect(controller.state.estimates[0]).toEqual({
      task_type: 'heavy',
      bytes_per_cost_unit: 50 * MB,
      heap_share: 1,
      samples: 4,
    });
  });

  it('never exceeds maxCapacity and emits only on change', () => {
    const estimator = new TaskMemoryEstimator({ defaultBytesPerTask: 10 * MB });
    const { controller, setHeap } = setup({ estimator });
    const seen: number[] = [];
    controller.capacity$.subscribe((value) => seen.push(value));
    setHeap(100);
    for (let i = 0; i < 20; i++) controller.refresh('tick');
    expect(controller.state.capacity).toBe(settings.maxCapacity);
    // the first decision runs in the constructor: min 2 + 5, then +5 per refresh
    expect(seen).toEqual([7, 12, 17, 22, 27, 32, 37, 42, 47, 50]);
  });

  it('only lowers capacity at claim time and raises it on the timer', () => {
    const estimator = new TaskMemoryEstimator({ defaultBytesPerTask: 10 * MB });
    const { controller, setHeap } = setup({ estimator });
    const start = controller.state.capacity;
    setHeap(100);
    expect(controller.refresh('claim')).toBe(start);
    expect(controller.refresh('tick')).toBe(start + settings.maxIncreasePerDecision);
    setHeap(1700);
    expect(controller.refresh('claim')).toBe(settings.minCapacity);
  });

  it('attributes the growth since the last sample to a run that ends between ticks', () => {
    const estimator = new TaskMemoryEstimator({ defaultBytesPerTask: 10 * MB });
    const { controller, setHeap, setRunning } = setup({ estimator });
    controller.tick();
    const fast = task('fast', 'quick', 1);
    setRunning([fast]);
    setHeap(1040);
    setRunning([]);
    controller.taskEnded(fast);
    expect(estimator.estimateBytes('task-fast', 'quick', 1)).toBe(40 * MB);
  });

  it('keeps light-task slots open while the heap budget is exhausted', () => {
    const { controller, setHeap, setRunning } = setup({
      settings: { lightTaskSlots: 8, lightTaskBytes: 4 * MB },
    });
    setRunning([task('a'), task('b')]);
    setHeap(1700);
    controller.refresh('tick');
    // over target: no free heap slots, but 2 running + 8 light slots
    expect(controller.state.free_slots).toBe(0);
    expect(controller.state.capacity).toBe(10);
    expect(controller.memoryGate().lightTaskBytes).toBe(4 * MB);
  });

  it('feeds post-GC heap samples to the estimator and stops observing on stop()', () => {
    const estimator = new TaskMemoryEstimator({
      defaultBytesPerTask: 100 * MB,
      calibrationBytes: 100 * MB,
    });
    const { controller, setHeap, setRunning, majorGc, unobserve } = setup({ estimator });
    setRunning([task('a', 'heavy')]);
    controller.tick(); // first sample at 1000 MB
    majorGc(); // live baseline 1000 MB
    setHeap(1400);
    controller.tick(); // +400 MB allocated
    setHeap(1100);
    majorGc(); // +100 MB live over the same period -> ratio 0.25
    expect(estimator.liveRatio()).toBeCloseTo(0.3 * 0.25 + 0.7 * 1, 3);
    controller.refresh('tick');
    expect(controller.state.heap_live_ratio).toBeCloseTo(0.775, 3);
    controller.stop();
    expect(unobserve).toHaveBeenCalledTimes(1);
  });

  it('takes the baseline from post-GC heap net of the running estimates, and keeps it under load', () => {
    const { controller, setHeap, setRunning, majorGc } = setup();
    setRunning([task('a', 'heavy')]); // default estimate: 100 MB
    setHeap(1300);
    majorGc(); // live 1300 MB - 100 MB committed
    controller.refresh('tick');
    expect(controller.state.heap_baseline_bytes).toBe(1200 * MB);
    // An idle tick no longer overwrites the live baseline with a garbage-laden reading.
    setRunning([]);
    setHeap(1500);
    controller.refresh('tick');
    expect(controller.state.heap_baseline_bytes).toBe(1200 * MB);
    // Later collections move it slowly.
    setHeap(1250);
    majorGc();
    controller.refresh('tick');
    expect(controller.state.heap_baseline_bytes).toBe((0.2 * 1250 + 0.8 * 1200) * MB);
  });

  it('lowers the idle baseline slowly so garbage does not read as demand for long', () => {
    const { controller, setHeap } = setup();
    setHeap(1400);
    controller.refresh('tick');
    expect(controller.state.heap_baseline_bytes).toBe(1080 * MB);
    expect(controller.state.heap_projected_bytes).toBe(1400 * MB);
  });

  describe('memory outside the heap', () => {
    it('attributes external growth to the running task and learns its heap share', () => {
      const { controller, setHeap, setExternal, setRunning } = setup();
      setRunning([task('a')]);
      controller.tick();
      setHeap(1100);
      setExternal(300);
      expect(controller.observeRunEnd(task('a'))).toEqual({
        bytes: 400 * MB,
        instanceBytes: 400 * MB,
        samples: 1,
      });
      controller.refresh('tick');
      expect(controller.state.heap_external_bytes).toBe(300 * MB);
      expect(controller.state.estimates[0]).toEqual({
        task_type: 't',
        bytes_per_cost_unit: 200 * MB,
        heap_share: 0.25,
        samples: 1,
      });
      // The heap budget holds the run's heap share only; the whole estimate is the memory figure.
      expect(controller.estimator.estimateBytes('task-a', 't', 2)).toBe(400 * MB);
      expect(controller.estimator.estimateHeapBytes('task-a', 't', 2)).toBe(100 * MB);
    });

    it('never calls a run light for a small heap share when its whole estimate is heavy', () => {
      const { controller, setHeap, setExternal, setRunning } = setup({
        settings: { lightTaskBytes: 8 * MB },
      });
      setRunning([task('a')]);
      controller.tick();
      setHeap(1004);
      setExternal(40);
      controller.observeRunEnd(task('a'));
      setRunning([]);
      controller.refresh('tick');
      const gate = controller.memoryGate();
      // 4 MB of heap would pass the light threshold; the 44 MB run as a whole does not.
      expect(gate.estimateBytes('task-a', 't', 2)).toBe(4 * MB);
      expect(gate.isLight?.('task-a', 't', 2)).toBe(false);
      expect(gate.isLight?.('task-unseen-light', 'light-type', 2)).toBe(false);
    });

    it('leaves the heap budget alone when only external memory grows and no limit is known', () => {
      const { controller, setExternal } = setup();
      controller.tick();
      const before = controller.state.heap_budget_bytes;
      setExternal(200);
      controller.refresh('tick');
      expect(controller.state.heap_budget_bytes).toBe(before);
      expect(controller.state.budget_source).toBe('heap');
    });

    it('prices candidates by their heap share against the heap budget and whole against the memory budget', () => {
      const { controller, setHeap, setExternal, setRunning, setRss } = setup({
        settings: { memoryLimitBytes: 2048 * MB },
      });
      setRunning([task('a')]);
      controller.tick();
      setHeap(1100);
      setExternal(300);
      controller.observeRunEnd(task('a'));
      setRunning([]);
      controller.refresh('tick');
      expect(controller.memoryGate().estimateBytes('task-a', 't', 2)).toBe(100 * MB);

      setRss(1700);
      controller.refresh('tick');
      expect(controller.state.budget_source).toBe('memory');
      expect(controller.memoryGate().estimateBytes('task-a', 't', 2)).toBe(400 * MB);
    });
  });

  describe('container memory limit', () => {
    it('keeps a single heap budget and never reads the resident set without a limit', () => {
      const { controller, getRssBytes } = setup();
      controller.tick();
      expect(controller.state.memory).toBeNull();
      expect(controller.state.budget_bytes).toBe(controller.state.heap_budget_bytes);
      expect(getRssBytes).not.toHaveBeenCalled();
    });

    it('takes the limit Node reports when none is configured', () => {
      const { controller } = setup({ constrainedMemory: 2048 * MB });
      controller.tick();
      expect(controller.state.memory?.limit_bytes).toBe(2048 * MB);
      expect(controller.state.memory?.target_bytes).toBe(Math.round(2048 * MB * 0.85));
    });

    it('lets the memory budget bind when the resident set is high and the heap budget otherwise', () => {
      const { controller, setRss } = setup({ settings: { memoryLimitBytes: 2048 * MB } });
      // rss 1200 of a 1740 MB target leaves 540 MB; the heap budget is 1536 - 1000 = 536 MB.
      controller.tick();
      expect(controller.state.memory).toEqual(
        expect.objectContaining({ rss_bytes: 1200 * MB, budget_bytes: Math.round(540.8 * MB) })
      );
      expect(controller.state.budget_bytes).toBe(controller.state.heap_budget_bytes);

      setRss(1700);
      controller.refresh('tick');
      expect(controller.state.memory?.budget_bytes).toBe(Math.round(40.8 * MB));
      expect(controller.state.budget_bytes).toBe(Math.round(40.8 * MB));
      expect(controller.memoryGate().budgetBytes).toBe(Math.round(40.8 * MB));
      expect(controller.state.free_slots).toBe(0);
    });

    it('projects the resident set from its idle floor plus the running estimates', () => {
      const { controller, setRss, setRunning, majorGc } = setup({
        settings: { memoryLimitBytes: 2048 * MB },
      });
      controller.tick();
      setRunning([task('a')]);
      // After a collection the floor is rss net of what the running task is budgeted at (100 MB default).
      setRss(1300);
      majorGc();
      controller.refresh('tick');
      expect(controller.state.memory?.baseline_bytes).toBe(1200 * MB);
      expect(controller.state.memory?.projected_bytes).toBe(1300 * MB);
    });
  });

  describe('reservations', () => {
    it('budgets a running task at its reservation when that is above its estimate', () => {
      const { controller, setRunning } = setup();
      controller.tick();
      setRunning([task('a')]);
      controller.refresh('tick');
      const withEstimate = controller.state.heap_budget_bytes; // default 100 MB
      setRunning([{ ...task('a'), reservedBytes: 400 * MB }]);
      controller.refresh('claim');
      expect(controller.state.heap_budget_bytes).toBe(withEstimate - 300 * MB);
      expect(controller.state.reservations).toEqual({ tasks: 1, bytes: 400 * MB });
      expect(controller.memoryGate().reservedBytes).toBe(400 * MB);

      // Released, or reserved below the estimate: the estimate applies again.
      setRunning([{ ...task('a'), reservedBytes: 0 }]);
      controller.refresh('tick');
      expect(controller.state.heap_budget_bytes).toBe(withEstimate);
      expect(controller.state.reservations).toEqual({ tasks: 0, bytes: 0 });
      setRunning([{ ...task('a'), reservedBytes: 10 * MB }]);
      controller.refresh('tick');
      expect(controller.state.heap_budget_bytes).toBe(withEstimate);
    });

    it('folds the peak a run reported into its estimate', () => {
      const { controller, setHeap, setRunning } = setup();
      setRunning([task('a')]);
      controller.tick();
      setHeap(1010);
      expect(controller.observeRunEnd(task('a'), 150 * MB)).toEqual({
        bytes: 150 * MB,
        instanceBytes: 150 * MB,
        samples: 1,
      });
      expect(controller.state.reported_runs).toBe(0);
      controller.refresh('tick');
      expect(controller.state.reported_runs).toBe(1);
    });
  });
});

describe('readMaxOldSpaceBytes', () => {
  it('reads --max-old-space-size from NODE_OPTIONS and from execArgv, in both spellings', () => {
    expect(readMaxOldSpaceBytes([], '--max-old-space-size=819')).toBe(819 * MB);
    expect(readMaxOldSpaceBytes(['--max-old-space-size=2048'], undefined)).toBe(2048 * MB);
    expect(readMaxOldSpaceBytes(['--max-old-space-size', '1024'], '')).toBe(1024 * MB);
  });

  it('lets a command-line flag override NODE_OPTIONS and returns undefined without a flag', () => {
    expect(readMaxOldSpaceBytes(['--max-old-space-size=1024'], '--max-old-space-size=4096')).toBe(
      1024 * MB
    );
    expect(readMaxOldSpaceBytes(['--inspect'], '--no-warnings')).toBeUndefined();
  });
});
