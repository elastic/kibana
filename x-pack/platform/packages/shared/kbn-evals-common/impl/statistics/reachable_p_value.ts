/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mcnemar, wilcoxonSignedRank } from '@elastic/statistics';
import type { ComparisonResult } from '../schemas/experiments/compare_experiments_route.gen';

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

/**
 * Smallest two-sided p-value the row's test can produce with `n` pairs, whatever the scores.
 * Rank and count tests have a floor: with 10 pairs Wilcoxon cannot go below 2/2^10 and McNemar
 * below 1/2^10. The paired t-test has none.
 */
export const minimumReachablePValue = (
  testId: ComparisonResult['hypothesisTest']['id'],
  n: number
): number => {
  if (n < 1) return 1;
  switch (testId) {
    case 'paired_t':
      return 0;
    case 'mcnemar':
      // Every pair discordant the same way.
      return mcnemar(Array(n).fill(1), Array(n).fill(0)).pValue ?? 1;
    case 'wilcoxon_signed_rank': {
      // Every difference with the same sign. Distinct magnitudes give the exact floor 2/2^n (n <=
      // 50); all-equal magnitudes maximise the normal-approximation z (sqrt(n)), which the test
      // uses for tied samples above 13 pairs. Any other sample sits between the two.
      const zeros = Array(n).fill(0);
      const distinct = wilcoxonSignedRank(range(n), zeros).pValue ?? 1;
      const tied = wilcoxonSignedRank(Array(n).fill(1), zeros).pValue ?? 1;
      return Math.min(distinct, tied);
    }
  }
};
