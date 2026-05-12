/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeTrialMetrics } from '../trial_metrics';

describe('computeTrialMetrics', () => {
  it('should return empty arrays for empty input', () => {
    const result = computeTrialMetrics([]);
    expect(result.passAtK).toEqual([]);
    expect(result.passToTheK).toEqual([]);
    expect(result.repetitions).toBe(0);
  });

  it('should return empty arrays for zero repetitions', () => {
    const result = computeTrialMetrics([[]]);
    expect(result.passAtK).toEqual([]);
    expect(result.passToTheK).toEqual([]);
    expect(result.repetitions).toBe(0);
  });

  it('should compute pass@1 for single repetition', () => {
    // 2 examples: first passes, second fails
    const results = [[true], [false]];
    const metrics = computeTrialMetrics(results);

    expect(metrics.repetitions).toBe(1);
    expect(metrics.passAtK).toHaveLength(1);
    // pass@1: average of [1, 0] = 0.5
    expect(metrics.passAtK[0]).toBeCloseTo(0.5);
    // pass^1: same as pass@1 for k=1
    expect(metrics.passToTheK[0]).toBeCloseTo(0.5);
  });

  it('should compute pass@k for multiple repetitions', () => {
    // 1 example with 3 repetitions: [pass, fail, pass] → 2/3 pass rate
    const results = [[true, false, true]];
    const metrics = computeTrialMetrics(results);

    expect(metrics.repetitions).toBe(3);
    expect(metrics.passAtK).toHaveLength(3);

    // pass@1 = 1 - C(1,1)/C(3,1) = 1 - 1/3 = 2/3
    expect(metrics.passAtK[0]).toBeCloseTo(2 / 3, 4);

    // pass@2 = 1 - C(1,2)/C(3,2) = 1 - 0/3 = 1.0
    expect(metrics.passAtK[1]).toBeCloseTo(1.0, 4);

    // pass@3 = 1.0 (since at least one pass exists)
    expect(metrics.passAtK[2]).toBeCloseTo(1.0, 4);
  });

  it('should compute pass^k correctly', () => {
    // 1 example with 3 repetitions: [pass, fail, pass] → 2/3 pass rate
    const results = [[true, false, true]];
    const metrics = computeTrialMetrics(results);

    // pass^1 = C(2,1)/C(3,1) = 2/3
    expect(metrics.passToTheK[0]).toBeCloseTo(2 / 3, 4);

    // pass^2 = C(2,2)/C(3,2) = 1/3
    expect(metrics.passToTheK[1]).toBeCloseTo(1 / 3, 4);

    // pass^3 = C(2,3)/C(3,3) = 0 (can't draw 3 passes from 2)
    expect(metrics.passToTheK[2]).toBeCloseTo(0, 4);
  });

  it('should handle all-pass case', () => {
    const results = [[true, true, true]];
    const metrics = computeTrialMetrics(results);

    expect(metrics.passAtK[0]).toBeCloseTo(1.0);
    expect(metrics.passAtK[2]).toBeCloseTo(1.0);
    expect(metrics.passToTheK[0]).toBeCloseTo(1.0);
    expect(metrics.passToTheK[2]).toBeCloseTo(1.0);
  });

  it('should handle all-fail case', () => {
    const results = [[false, false, false]];
    const metrics = computeTrialMetrics(results);

    expect(metrics.passAtK[0]).toBeCloseTo(0);
    expect(metrics.passAtK[2]).toBeCloseTo(0);
    expect(metrics.passToTheK[0]).toBeCloseTo(0);
    expect(metrics.passToTheK[2]).toBeCloseTo(0);
  });

  it('should average across multiple examples', () => {
    // 2 examples, 2 reps each
    // Example 1: [pass, fail] → pass rate 0.5
    // Example 2: [pass, pass] → pass rate 1.0
    const results = [
      [true, false],
      [true, true],
    ];
    const metrics = computeTrialMetrics(results);

    // pass@1: avg of [0.5, 1.0] = 0.75
    expect(metrics.passAtK[0]).toBeCloseTo(0.75);

    // pass^1: avg of [0.5, 1.0] = 0.75
    expect(metrics.passToTheK[0]).toBeCloseTo(0.75);
  });
});
