/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compareScores } from '@kbn/evals-common';
import type { PairedScore } from '@kbn/evals-common';
import { minimumReachablePValue } from './reachable_p_value';

const makePairs = (target: number[], baseline: number[]): PairedScore[] =>
  target.map((scoreTarget, i) => ({
    datasetId: 'ds-1',
    datasetName: 'Dataset One',
    evaluatorName: 'Correctness',
    scoreTarget,
    scoreBaseline: baseline[i],
    direction: 'maximize',
  }));

describe('minimumReachablePValue', () => {
  it('returns the exact floors of the rank and count tests', () => {
    expect(minimumReachablePValue('wilcoxon_signed_rank', 10)).toBeCloseTo(2 / 2 ** 10, 12);
    expect(minimumReachablePValue('mcnemar', 10)).toBeCloseTo(1 / 2 ** 10, 12);
  });

  it('has no floor for the paired t-test and none to reach without pairs', () => {
    expect(minimumReachablePValue('paired_t', 10)).toBe(0);
    expect(minimumReachablePValue('wilcoxon_signed_rank', 0)).toBe(1);
  });

  it('is never above what the shared comparison returns for any sample', () => {
    // Tied magnitudes above 13 pairs take the normal approximation, which can beat 2/2^n.
    const samples: Array<[number[], number[]]> = [
      [Array(14).fill(0.2), Array(14).fill(0.8)],
      [Array.from({ length: 14 }, (_, i) => i / 20), Array(14).fill(0.9)],
      [Array.from({ length: 30 }, (_, i) => (i % 3) / 10), Array(30).fill(0.9)],
    ];
    for (const [target, baseline] of samples) {
      const [result] = compareScores(makePairs(target, baseline));
      expect(
        minimumReachablePValue(result.hypothesisTest.id, result.sampleSize)
      ).toBeLessThanOrEqual(result.pValue as number);
    }
  });
});
