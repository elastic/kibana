/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TrialMetrics } from '../types';

/**
 * Computes pass@k and pass^k metrics from a matrix of per-example, per-repetition pass/fail results.
 *
 * pass@k: probability that at least one of k trials passes (optimistic — "can it ever work?")
 * pass^k: probability that all k trials pass (pessimistic — "does it always work?")
 *
 * @param results - 2D boolean matrix: results[exampleIndex][repetitionIndex] = passed
 * @returns TrialMetrics with passAtK[k] and passToTheK[k] for k = 1..repetitions
 */
export const computeTrialMetrics = (results: boolean[][]): TrialMetrics => {
  if (results.length === 0) {
    return { passAtK: [], passToTheK: [], repetitions: 0 };
  }

  const repetitions = results[0].length;
  if (repetitions === 0) {
    return { passAtK: [], passToTheK: [], repetitions: 0 };
  }

  const n = results.length; // number of examples

  // For each example, count how many repetitions passed
  const passCounts = results.map((reps) => reps.filter(Boolean).length);

  const passAtK: number[] = [];
  const passToTheK: number[] = [];

  for (let k = 1; k <= repetitions; k++) {
    // pass@k per example: 1 - C(n_fail, k) / C(total, k)
    // where n_fail = repetitions - passCount
    // Simplified: probability that at least 1 of k random draws is a pass
    let sumPassAtK = 0;
    let sumPassToTheK = 0;

    for (const passCount of passCounts) {
      const failCount = repetitions - passCount;

      if (k > repetitions) {
        // Can't draw more than we have
        sumPassAtK += passCount > 0 ? 1 : 0;
        sumPassToTheK += passCount === repetitions ? 1 : 0;
      } else {
        // pass@k = 1 - C(failCount, k) / C(repetitions, k)
        // Using the product formula to avoid large factorials
        let probAllFail = 1;
        let probAllPass = 1;

        for (let i = 0; i < k; i++) {
          probAllFail *= (failCount - i) / (repetitions - i);
          probAllPass *= (passCount - i) / (repetitions - i);
        }

        // Clamp to [0, 1] to handle negative numerators (when k > failCount or k > passCount)
        probAllFail = Math.max(0, Math.min(1, probAllFail));
        probAllPass = Math.max(0, Math.min(1, probAllPass));

        sumPassAtK += 1 - probAllFail;
        sumPassToTheK += probAllPass;
      }
    }

    passAtK.push(sumPassAtK / n);
    passToTheK.push(sumPassToTheK / n);
  }

  return { passAtK, passToTheK, repetitions };
};
