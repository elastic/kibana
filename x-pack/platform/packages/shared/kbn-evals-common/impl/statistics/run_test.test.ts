/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvalidTestForDataError, runPairedTest } from './run_test';

// Reference values are the scipy / statsmodels numbers recorded in the
// @elastic/statistics fixtures (`src/non_parametric_tests/__fixtures__/*.json`).
const PRECISION = 9;

describe('runPairedTest', () => {
  describe('paired_t', () => {
    it('pins the p-value for differences 1..5 (population-SD variant of the t statistic)', () => {
      // scipy.ttest_rel reports t=4.243, p=0.0132 for these diffs. The package divides by n
      // instead of n-1 in the standard deviation, so its t is inflated by sqrt(n/(n-1)).
      // This pin guards the "identical to before" guarantee until the package changes.
      const outcome = runPairedTest('paired_t', [1, 2, 3, 4, 5], [0, 0, 0, 0, 0]);

      expect(outcome.id).toBe('paired_t');
      expect(outcome.method).toBeUndefined();
      expect(outcome.statistic).toBeCloseTo(4.743416490252569, PRECISION);
      expect(outcome.pValue).toBeCloseTo(0.009014481314230329, PRECISION);
    });

    it('returns null statistic and p-value with a single pair', () => {
      expect(runPairedTest('paired_t', [1], [0])).toEqual({
        id: 'paired_t',
        statistic: null,
        pValue: null,
      });
    });
  });

  describe('wilcoxon_signed_rank', () => {
    const corn = [6, 8, 14, 16, 23, 24, 28, 29, 41, -48, 49, 56, 60, -67, 75];

    it('matches scipy on the corn sample and reports the exact method', () => {
      const outcome = runPairedTest(
        'wilcoxon_signed_rank',
        corn,
        corn.map(() => 0)
      );

      expect(outcome.id).toBe('wilcoxon_signed_rank');
      expect(outcome.method).toBe('exact');
      expect(outcome.statistic).toBe(24);
      expect(outcome.pValue).toBeCloseTo(0.041259765625, PRECISION);
    });

    it('reports the asymptotic method when a zero difference forces the normal approximation', () => {
      const outcome = runPairedTest(
        'wilcoxon_signed_rank',
        [...corn, 10],
        [...corn.map(() => 0), 10]
      );

      expect(outcome.method).toBe('asymptotic');
      expect(outcome.statistic).toBe(24);
      expect(outcome.pValue).toBeCloseTo(0.04088813291185591, PRECISION);
    });

    it('returns a p-value of 1 when every difference is zero', () => {
      const outcome = runPairedTest('wilcoxon_signed_rank', [1, 2, 3], [1, 2, 3]);

      expect(outcome.statistic).toBe(0);
      expect(outcome.pValue).toBe(1);
    });

    it('omits the method when the test could not run', () => {
      expect(runPairedTest('wilcoxon_signed_rank', [], [])).toEqual({
        id: 'wilcoxon_signed_rank',
        statistic: null,
        pValue: null,
      });
    });
  });

  describe('mcnemar', () => {
    it('matches statsmodels mid-p on the textbook table', () => {
      // 10 both succeed, 8 target only, 5 baseline only, 27 both fail.
      const target = [
        ...Array(10).fill(1),
        ...Array(5).fill(0),
        ...Array(8).fill(1),
        ...Array(27).fill(0),
      ];
      const baseline = [
        ...Array(10).fill(1),
        ...Array(5).fill(1),
        ...Array(8).fill(0),
        ...Array(27).fill(0),
      ];

      const outcome = runPairedTest('mcnemar', target, baseline);

      expect(outcome.id).toBe('mcnemar');
      expect(outcome.method).toBe('mid-p');
      expect(outcome.statistic).toBe(5);
      expect(outcome.pValue).toBeCloseTo(0.42395019531249983, PRECISION);
    });

    it('matches the fixture when every discordant pair favours the target', () => {
      const outcome = runPairedTest('mcnemar', [1, 1, 1, 1], [0, 0, 0, 0]);

      expect(outcome.statistic).toBe(0);
      expect(outcome.pValue).toBeCloseTo(0.0625, PRECISION);
    });

    it('returns a p-value of 1 with no discordant pairs', () => {
      const outcome = runPairedTest('mcnemar', [1, 0, 1, 1, 0], [1, 0, 1, 1, 0]);

      expect(outcome.statistic).toBe(0);
      expect(outcome.pValue).toBe(1);
    });

    it('throws InvalidTestForDataError on scores other than 0 and 1', () => {
      expect(() => runPairedTest('mcnemar', [1, 0.5], [0, 1])).toThrow(InvalidTestForDataError);
      expect(() => runPairedTest('mcnemar', [1, 0], [0, 0.25])).toThrow(/observed 0.25/);
    });

    it('exposes the offending test id on the error', () => {
      try {
        runPairedTest('mcnemar', [0.4], [0.8]);
        throw new Error('expected runPairedTest to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidTestForDataError);
        expect((error as InvalidTestForDataError).test).toBe('mcnemar');
      }
    });
  });
});
