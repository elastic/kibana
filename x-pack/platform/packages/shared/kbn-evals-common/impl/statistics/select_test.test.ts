/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PARAMETRIC_UPGRADE_MIN_PAIRS, selectTest } from './select_test';

// 40 paired differences shaped like a normal distribution (Shapiro-Wilk p ≈ 0.37).
const NORMAL_DIFFERENCES = [
  -3, -2, -2, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 3,
].flatMap((value) => [value * 0.01 + 0.02, value * 0.011 + 0.021]);

// 40 paired differences with a long right tail (Shapiro-Wilk p ≈ 2e-6).
const SKEWED_DIFFERENCES = Array.from({ length: 40 }, (_, index) =>
  index < 34 ? 0.005 * (index + 1) : [0.4, 0.5, 0.6, 0.7, 0.8, 0.9][index - 34]
);

const BASELINE_40 = Array.from({ length: 40 }, (_, index) => 0.5 + (index % 7) * 0.03);

const withDifferences = (baseline: number[], differences: number[]) => ({
  baseline,
  target: baseline.map((value, index) => Math.min(1, value + differences[index])),
});

describe('selectTest', () => {
  it('picks McNemar for binary scores', () => {
    expect(selectTest([1, 1, 0, 1], [0, 1, 0, 0])).toEqual({
      metricType: 'binary',
      testId: 'mcnemar',
    });
  });

  describe('continuous', () => {
    it('picks Wilcoxon below the pair threshold', () => {
      const target = [0.9, 0.8, 0.7, 0.95, 0.6];
      const baseline = [0.5, 0.4, 0.3, 0.2, 0.1];

      expect(selectTest(target, baseline)).toEqual({
        metricType: 'continuous_bounded',
        testId: 'wilcoxon_signed_rank',
      });
    });

    it('upgrades to paired t when n is large enough and the differences look normal', () => {
      const { target, baseline } = withDifferences(BASELINE_40, NORMAL_DIFFERENCES);

      expect(selectTest(target, baseline)).toEqual({
        metricType: 'continuous_bounded',
        testId: 'paired_t',
      });
    });

    it('stays on Wilcoxon when n is large enough but the differences are skewed', () => {
      const { target, baseline } = withDifferences(BASELINE_40, SKEWED_DIFFERENCES);

      expect(selectTest(target, baseline).testId).toBe('wilcoxon_signed_rank');
    });

    it('stays on Wilcoxon when the differences look normal but n is one short', () => {
      const size = PARAMETRIC_UPGRADE_MIN_PAIRS - 1;
      const { target, baseline } = withDifferences(
        BASELINE_40.slice(0, size),
        NORMAL_DIFFERENCES.slice(0, size)
      );

      expect(selectTest(target, baseline).testId).toBe('wilcoxon_signed_rank');
    });

    it('applies the same upgrade rule to unbounded scores', () => {
      const baseline = BASELINE_40.map((value) => value * 1000);
      const target = baseline.map((value, index) => value + NORMAL_DIFFERENCES[index] * 1000);

      expect(selectTest(target, baseline)).toEqual({
        metricType: 'continuous_unbounded',
        testId: 'paired_t',
      });
    });

    it('does not upgrade when every difference is zero (Shapiro-Wilk undefined)', () => {
      expect(selectTest(BASELINE_40, BASELINE_40).testId).toBe('wilcoxon_signed_rank');
    });
  });

  it('picks Wilcoxon for counts and never upgrades, even with normal-looking differences', () => {
    const baseline = Array.from({ length: 40 }, (_, index) => 10 + (index % 5));
    const target = baseline.map(
      (value, index) => value + Math.round(NORMAL_DIFFERENCES[index] * 100)
    );

    expect(selectTest(target, baseline)).toEqual({
      metricType: 'count',
      testId: 'wilcoxon_signed_rank',
    });
  });

  it('picks Wilcoxon for ordinal scores and never upgrades', () => {
    const baseline = Array.from({ length: 40 }, (_, index) => 1 + (index % 5));
    const target = baseline.map((value, index) =>
      Math.max(1, Math.min(5, value + Math.round(NORMAL_DIFFERENCES[index] * 100)))
    );

    expect(selectTest(target, baseline)).toEqual({
      metricType: 'ordinal_k',
      testId: 'wilcoxon_signed_rank',
    });
  });
});
