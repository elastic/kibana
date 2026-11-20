/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComparisonResult, PairedScore } from '@kbn/evals-common';
import { attachIdenticalPairs } from './identical_pairs';

const side = (mean: number) => ({ mean, used: 1, missing: 0, stability: null });

const row = (datasetId: string, evaluatorName: string): ComparisonResult => ({
  datasetId,
  datasetName: datasetId,
  evaluatorName,
  sampleSize: 3,
  target: side(0.5),
  baseline: side(0.5),
  pValue: null,
  direction: 'maximize',
  metricType: 'continuous_bounded',
  repetitionWarning: false,
  hypothesisTest: { id: 'wilcoxon_signed_rank', method: 'exact', statistic: null },
});

const pair = (
  datasetId: string,
  evaluatorName: string,
  scoreTarget: number,
  scoreBaseline: number
): PairedScore => ({
  datasetId,
  datasetName: datasetId,
  evaluatorName,
  scoreTarget,
  scoreBaseline,
  direction: 'maximize',
});

describe('attachIdenticalPairs', () => {
  it('flags a slice only when every pair has a zero difference', () => {
    const pairs = [
      ...[0.5, 0.5, 0.5].map((score) => pair('d', 'same', score, score)),
      pair('d', 'swing', 0.7, 0.5),
      pair('d', 'swing', 0.3, 0.5),
      pair('d', 'swing', 0.5, 0.5),
    ];

    const [same, swing] = attachIdenticalPairs([row('d', 'same'), row('d', 'swing')], pairs);

    expect(same.allPairsIdentical).toBe(true);
    // Equal means (0.5 vs 0.5) but not identical pairs.
    expect(swing.allPairsIdentical).toBe(false);
  });

  it('ignores differences below the 1e-9 roundoff of averaged repetitions', () => {
    const [result] = attachIdenticalPairs(
      [row('d', 'avg')],
      [pair('d', 'avg', 1 / 3 + 1e-12, 1 / 3), pair('d', 'avg', 0.5, 0.5)]
    );

    expect(result.allPairsIdentical).toBe(true);
  });

  it('leaves the flag unset for a slice with no pairs', () => {
    const [result] = attachIdenticalPairs([row('d', 'none')], []);

    expect(result).toHaveProperty('allPairsIdentical', undefined);
  });
});
