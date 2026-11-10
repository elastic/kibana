/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskMemoryEstimator } from './task_memory_estimator';

const MB = 1024 * 1024;

const run = (executionId: string, taskType: string, cost = 2, taskId = `task-${executionId}`) => ({
  executionId,
  taskId,
  taskType,
  cost,
});

describe('TaskMemoryEstimator', () => {
  it('uses the default for unobserved types', () => {
    const estimator = new TaskMemoryEstimator({ defaultBytesPerTask: 64 * MB });
    expect(estimator.estimateBytes('task-x', 'unknown', 2)).toBe(64 * MB);
    expect(estimator.bytesPerCostUnit()).toBe(32 * MB);
    expect(estimator.hasObservations()).toBe(false);
  });

  it('prices an unseen task at the flat default whatever its cost', () => {
    const estimator = new TaskMemoryEstimator({ defaultBytesPerTask: 64 * MB });
    // Cost describes CPU and Elasticsearch load, so an ExtraLarge task is not ten defaults of heap.
    expect(estimator.estimateBytes('tiny', 'tiny-type', 1)).toBe(64 * MB);
    expect(estimator.estimateBytes('indicator', 'siem.indicatorRule', 10)).toBe(64 * MB);
    // Once its type has history the per-cost-unit estimate applies again.
    estimator.sample(0, []);
    estimator.sample(0, [
      { executionId: 'r1', taskId: 'seen', taskType: 'siem.indicatorRule', cost: 10 },
    ]);
    estimator.sample(100 * MB, [
      { executionId: 'r1', taskId: 'seen', taskType: 'siem.indicatorRule', cost: 10 },
    ]);
    estimator.sample(100 * MB, []);
    expect(estimator.estimateBytes('indicator', 'siem.indicatorRule', 10)).toBe(100 * MB);
  });

  it('attributes heap growth to the running tasks by cost', () => {
    const estimator = new TaskMemoryEstimator({ defaultBytesPerTask: 64 * MB });
    const heavy = run('a', 'heavy', 4);
    const light = run('b', 'light', 1);
    estimator.sample(1000 * MB, [heavy, light]);
    estimator.sample(1100 * MB, [heavy, light]);
    estimator.sample(1050 * MB, [heavy, light]); // garbage collected, ignored
    estimator.sample(1050 * MB, []);

    // 100 MB growth split 4:1 by cost, then divided by cost -> 20 MB per cost unit each
    expect(estimator.estimateBytes('task-a', 'heavy', 4)).toBe(80 * MB);
    expect(estimator.estimateBytes('task-b', 'light', 1)).toBe(20 * MB);
    // an unseen instance of a seen type is never priced below the cold-start default
    expect(estimator.estimateBytes('task-new', 'heavy', 4)).toBe(80 * MB);
    expect(estimator.snapshot()).toEqual([
      { task_type: 'heavy', bytes_per_cost_unit: 20 * MB, heap_share: 1, samples: 1 },
      { task_type: 'light', bytes_per_cost_unit: 20 * MB, heap_share: 1, samples: 1 },
    ]);
  });

  it('estimates unseen instances from the heavy end of their type', () => {
    const estimator = new TaskMemoryEstimator({ defaultBytesPerTask: 64 * MB, alpha: 0.5 });
    estimator.sample(0, [run('a', 't')]);
    estimator.sample(100 * MB, [run('a', 't')]);
    estimator.sample(100 * MB, []);
    expect(estimator.estimateBytes('task-a', 't', 2)).toBe(100 * MB);

    estimator.sample(100 * MB, [run('b', 't')]);
    estimator.sample(300 * MB, [run('b', 't')]);
    estimator.sample(300 * MB, []);
    // type p90 of [50, 100] MB per cost unit = 100; instances keep their own history
    expect(estimator.estimateBytes('task-unseen', 't', 2)).toBe(200 * MB);
    expect(estimator.estimateBytes('task-a', 't', 2)).toBe(100 * MB);
    expect(estimator.estimateBytes('task-b', 't', 2)).toBe(200 * MB);
    expect(estimator.snapshot()[0]).toEqual({
      task_type: 't',
      bytes_per_cost_unit: 100 * MB,
      heap_share: 1,
      samples: 2,
    });
  });

  it('does not let cheap instances of a type make an unseen instance look light', () => {
    const estimator = new TaskMemoryEstimator({ defaultBytesPerTask: 4 * MB });
    estimator.sample(0, [run('heavy', 'rule')]);
    estimator.sample(100 * MB, [run('heavy', 'rule')]);
    estimator.sample(100 * MB, []); // heavy instance: 50 MB per cost unit
    for (let i = 0; i < 5; i++) {
      estimator.sample(100 * MB, [run(`light-${i}`, 'rule')]);
      estimator.sample(101 * MB, [run(`light-${i}`, 'rule')]);
      estimator.sample(101 * MB, []); // 0.5 MB per cost unit each
      estimator.sample(100 * MB, []);
    }
    expect(estimator.estimateBytes('task-light-0', 'rule', 2)).toBe(MB);
    expect(estimator.estimateBytes('task-unseen', 'rule', 2)).toBe(100 * MB);
  });

  it('prices an unseen instance at the default while only cheap instances of its type have run', () => {
    const estimator = new TaskMemoryEstimator({ defaultBytesPerTask: 64 * MB });
    // a fresh node: the sixty light rules come due first and fill the type window
    for (let i = 0; i < 40; i++) {
      estimator.sample(100 * MB, [run(`light-${i}`, 'rule')]);
      estimator.sample(101 * MB, [run(`light-${i}`, 'rule')]);
      estimator.sample(101 * MB, []);
      estimator.sample(100 * MB, []);
    }
    expect(estimator.estimateBytes('task-light-0', 'rule', 2)).toBe(MB);
    // the type's heavy end is 0.5 MB per cost unit; an unseen rule still costs the default
    expect(estimator.estimateBytes('task-unseen', 'rule', 2)).toBe(64 * MB);
  });

  it('sizes a slot from the heavy end of the recent mix', () => {
    const estimator = new TaskMemoryEstimator({ defaultBytesPerTask: 64 * MB });
    for (let i = 0; i < 9; i++) estimator.taskEnded(run(`cheap-${i}`, 'cheap', 1));
    estimator.sample(0, [run('heavy', 'heavy', 1)]);
    estimator.sample(30 * MB, [run('heavy', 'heavy', 1)]);
    estimator.taskEnded(run('heavy', 'heavy', 1));
    // 9 cheap runs at the floor and one 30 MB run: p90 lands on the heavy one
    expect(estimator.bytesPerCostUnit()).toBe(30 * MB);
  });

  it('scales estimates by the live-to-allocated ratio once calibrated', () => {
    const estimator = new TaskMemoryEstimator({
      defaultBytesPerTask: 64 * MB,
      calibrationBytes: 100 * MB,
      alpha: 1,
    });
    estimator.sample(0, [run('a', 't', 1)]);
    estimator.liveSample(0);
    estimator.sample(200 * MB, [run('a', 't', 1)]); // 200 MB allocated by run a
    estimator.sample(200 * MB, []);
    expect(estimator.estimateBytes('task-a', 't', 1)).toBe(200 * MB);
    expect(estimator.liveRatio()).toBe(1);

    estimator.liveSample(50 * MB); // only 50 MB of it is live after GC -> ratio 0.25
    expect(estimator.liveRatio()).toBe(0.25);
    expect(estimator.estimateBytes('task-a', 't', 1)).toBe(50 * MB);
    expect(estimator.bytesPerCostUnit()).toBe(50 * MB);
    // the cold-start default is not scaled: it is a guess, not an allocation
    expect(estimator.estimateBytes('task-new', 'other', 1)).toBe(64 * MB);
  });

  it('sizes slots from heavy runs only, even when light runs dominate', () => {
    const estimator = new TaskMemoryEstimator({
      defaultBytesPerTask: 64 * MB,
      lightBytesPerCostUnit: 4 * MB,
    });
    // 20 light runs at 1 MB and two heavy runs at 50 MB
    for (let i = 0; i < 20; i++) {
      estimator.sample(0, [run(`l${i}`, 'light', 1)]);
      estimator.sample(MB, [run(`l${i}`, 'light', 1)]);
      estimator.sample(MB, []);
    }
    for (const id of ['h1', 'h2']) {
      estimator.sample(0, [run(id, 'heavy', 1)]);
      estimator.sample(50 * MB, [run(id, 'heavy', 1)]);
      estimator.sample(50 * MB, []);
    }
    expect(estimator.bytesPerCostUnit()).toBe(50 * MB);
    // with no heavy run observed yet the cold-start default applies
    const fresh = new TaskMemoryEstimator({
      defaultBytesPerTask: 64 * MB,
      lightBytesPerCostUnit: 4 * MB,
    });
    fresh.taskEnded(run('l', 'light', 1));
    expect(fresh.bytesPerCostUnit()).toBe(32 * MB);
  });

  it('records a run that ends between samples, clamped to the minimum', () => {
    const estimator = new TaskMemoryEstimator({
      defaultBytesPerTask: 64 * MB,
      minBytesPerCostUnit: MB,
    });
    estimator.taskEnded(run('fast', 'tiny', 1));
    expect(estimator.hasObservations()).toBe(true);
    expect(estimator.estimateBytes('task-fast', 'tiny', 1)).toBe(MB);
  });

  it('does not count a run twice when it ends and then leaves the sample', () => {
    const estimator = new TaskMemoryEstimator({ defaultBytesPerTask: 64 * MB });
    estimator.sample(0, [run('a', 't')]);
    estimator.sample(50 * MB, [run('a', 't')]);
    estimator.taskEnded(run('a', 't'));
    estimator.sample(50 * MB, []);
    expect(estimator.snapshot()[0].samples).toBe(1);
  });

  describe('persisted estimates', () => {
    it('budgets a seeded instance by its document value and leaves the type history alone', () => {
      const estimator = new TaskMemoryEstimator({ defaultBytesPerTask: 64 * MB });
      expect(estimator.seed('task-x', 't', 2, 20 * MB, 3)).toBe(true);
      expect(estimator.estimateBytes('task-x', 't', 2)).toBe(20 * MB);
      expect(estimator.seededCount()).toBe(1);
      // the seed is already live-ratio scaled by its writer, so calibration here must not touch it
      estimator.liveSample(0);
      estimator.sample(0, [run('z', 'other')]);
      estimator.sample(400 * MB, [run('z', 'other')]);
      estimator.sample(400 * MB, []);
      estimator.liveSample(100 * MB);
      expect(estimator.liveRatio()).toBeLessThan(1);
      expect(estimator.estimateBytes('task-x', 't', 2)).toBe(20 * MB);
      // an unseen sibling of the type still gets the cold-start default
      expect(estimator.estimateBytes('task-y', 't', 2)).toBe(64 * MB);
      // a second seed for a known instance is ignored
      expect(estimator.seed('task-x', 't', 2, 90 * MB, 1)).toBe(false);
      expect(estimator.estimateBytes('task-x', 't', 2)).toBe(20 * MB);
    });

    it('replaces a seed with the first local observation', () => {
      const estimator = new TaskMemoryEstimator({ defaultBytesPerTask: 64 * MB });
      estimator.seed('task-a', 't', 2, 20 * MB, 5);
      estimator.sample(0, [run('a', 't')]);
      estimator.sample(50 * MB, [run('a', 't')]);
      estimator.sample(50 * MB, []);
      expect(estimator.estimateBytes('task-a', 't', 2)).toBe(50 * MB);
    });

    it('finalises a run once and returns what was learned', () => {
      const estimator = new TaskMemoryEstimator({ defaultBytesPerTask: 64 * MB });
      estimator.sample(0, [run('a', 't')]);
      estimator.sample(40 * MB, [run('a', 't')]);
      expect(estimator.finalizeRun(run('a', 't'))).toEqual({
        bytes: 40 * MB,
        instanceBytes: 40 * MB,
        samples: 1,
      });
      expect(estimator.isFinalized('a')).toBe(true);
      expect(estimator.finalizeRun(run('a', 't'))).toBeUndefined();
      // the pool's later notification and a sample that still lists the run do not count it again
      estimator.taskEnded(run('a', 't'));
      estimator.sample(60 * MB, [run('a', 't')]);
      estimator.sample(60 * MB, []);
      expect(estimator.snapshot()[0].samples).toBe(1);
      expect(estimator.estimateBytes('task-a', 't', 2)).toBe(40 * MB);
    });
  });

  describe('task reports', () => {
    const observeWithReport = (reported: number | undefined, measuredMb: number) => {
      const estimator = new TaskMemoryEstimator({ defaultBytesPerTask: 64 * MB });
      estimator.sample(0, [run('r1', 'type')]);
      estimator.sample(measuredMb * MB, [run('r1', 'type')]);
      const observation = estimator.finalizeRun(run('r1', 'type'), reported);
      return { estimator, observation };
    };

    it('records a report above the measured share', () => {
      const { estimator, observation } = observeWithReport(150 * MB, 40);
      expect(observation?.bytes).toBe(150 * MB);
      expect(estimator.estimateBytes('task-r1', 'type', 2)).toBe(150 * MB);
      expect(estimator.reportedRunCount()).toBe(1);
    });

    it('keeps the measured share when the report is below it', () => {
      const { estimator, observation } = observeWithReport(10 * MB, 90);
      expect(observation?.bytes).toBe(90 * MB);
      expect(estimator.estimateBytes('task-r1', 'type', 2)).toBe(90 * MB);
      expect(estimator.reportedRunCount()).toBe(1);
    });

    it('is unchanged for a run that did not report', () => {
      const { estimator, observation } = observeWithReport(undefined, 90);
      expect(observation?.bytes).toBe(90 * MB);
      expect(estimator.reportedRunCount()).toBe(0);
    });

    it('lifts a report into the allocation domain so the scaled estimate still covers it', () => {
      const estimator = new TaskMemoryEstimator({
        defaultBytesPerTask: 64 * MB,
        calibrationBytes: 100 * MB,
        alpha: 1,
      });
      // 400 MB allocated, 100 MB live after collection: ratio 0.25.
      estimator.sample(0, [run('r0', 'type')]);
      estimator.liveSample(0);
      estimator.sample(400 * MB, [run('r0', 'type')]);
      estimator.taskEnded(run('r0', 'type'));
      estimator.liveSample(100 * MB);
      expect(estimator.liveRatio()).toBe(0.25);

      estimator.sample(400 * MB, [run('r1', 'type')]);
      estimator.sample(410 * MB, [run('r1', 'type')]);
      estimator.finalizeRun(run('r1', 'type'), 150 * MB);
      expect(estimator.estimateBytes('task-r1', 'type', 2)).toBe(150 * MB);
    });
  });

  describe('memory outside the heap', () => {
    it('learns the heap share of a type from the split of its growth', () => {
      const estimator = new TaskMemoryEstimator({ defaultBytesPerTask: 64 * MB, alpha: 1 });
      estimator.sample(0, [run('r1', 'stream')], 0);
      estimator.sample(10 * MB, [run('r1', 'stream')], 90 * MB);
      estimator.taskEnded(run('r1', 'stream'));
      expect(estimator.heapShare('stream')).toBe(0.1);
      expect(estimator.estimateBytes('task-r1', 'stream', 2)).toBe(100 * MB);
      expect(estimator.estimateHeapBytes('task-r1', 'stream', 2)).toBe(10 * MB);
      expect(estimator.heapShare('unknown')).toBe(1);
      expect(estimator.snapshot()[0]).toEqual({
        task_type: 'stream',
        bytes_per_cost_unit: 50 * MB,
        heap_share: 0.1,
        samples: 1,
      });
    });

    it('calibrates the live ratio on heap and external memory together', () => {
      const estimator = new TaskMemoryEstimator({
        defaultBytesPerTask: 64 * MB,
        calibrationBytes: 100 * MB,
        alpha: 1,
      });
      estimator.liveSample(0, 0);
      estimator.sample(0, [run('r1', 'stream')], 0);
      estimator.sample(100 * MB, [run('r1', 'stream')], 300 * MB);
      estimator.taskEnded(run('r1', 'stream'));
      estimator.liveSample(50 * MB, 50 * MB);
      expect(estimator.liveRatio()).toBe(0.25);
    });
  });
});
