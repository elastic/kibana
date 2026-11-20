/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mcnemar, pairedT, wilcoxonSignedRank } from '@elastic/statistics';
import type { StatisticalTestId } from '../schemas/experiments/compare_experiments_route.gen';

export interface PairedTestOutcome {
  id: StatisticalTestId;
  /** Variant of the test that produced the p-value */
  method?: string;
  statistic: number | null;
  pValue: number | null;
}

/** Run one paired hypothesis test on aligned target/baseline scores. */
export function runPairedTest(
  test: StatisticalTestId,
  target: number[],
  baseline: number[]
): PairedTestOutcome {
  switch (test) {
    case 'paired_t': {
      const { statistic, pValue } = pairedT(target, baseline);
      return { id: test, statistic, pValue };
    }
    case 'wilcoxon_signed_rank': {
      // Package defaults: two-sided, zero differences discarded (`wilcox`), method `auto`.
      // `auto` does not report which method it resolved to; a z-statistic is only set when
      // the normal approximation was used. Both remaining paths (the exact distribution and
      // the exhaustive sign-flip permutation used for small samples with ties) are exact.
      const { statistic, pValue, zStatistic } = wilcoxonSignedRank(target, baseline);
      return {
        id: test,
        ...(pValue !== null && { method: zStatistic !== null ? 'asymptotic' : 'exact' }),
        statistic,
        pValue,
      };
    }
    case 'mcnemar': {
      const { statistic, pValue, method } = mcnemar(target, baseline);
      return { id: test, method, statistic, pValue };
    }
  }
}
