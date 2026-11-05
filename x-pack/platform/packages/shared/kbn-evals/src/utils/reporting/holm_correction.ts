/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComparisonResult } from '@kbn/evals-common';

/**
 * A comparison row that may carry a multiplicity-adjusted p-value. `undefined` means no
 * correction was applied; `null` means the row had no p-value to adjust.
 */
export type CorrectableComparisonResult = ComparisonResult & {
  adjustedPValue?: number | null;
};

const isUsablePValue = (value: number | null): value is number =>
  value !== null && Number.isFinite(value);

/**
 * Holm-Bonferroni step-down adjustment. Returns adjusted p-values in the input order, capped at 1.
 * Controls the family-wise error rate without assuming the tests are independent.
 */
export const holmBonferroniAdjust = (pValues: readonly number[]): number[] => {
  const m = pValues.length;
  const order = pValues.map((p, index) => ({ p, index })).sort((a, b) => a.p - b.p);

  const adjusted = new Array<number>(m);
  let runningMax = 0;
  order.forEach(({ p, index }, rank) => {
    runningMax = Math.max(runningMax, Math.min(1, (m - rank) * p));
    adjusted[index] = runningMax;
  });
  return adjusted;
};

/**
 * Adds `adjustedPValue` to every row. The family is all rows with a usable p-value; rows whose
 * test could not run get `null` and do not count towards the family size.
 */
export const applyHolmCorrection = (
  results: readonly ComparisonResult[]
): CorrectableComparisonResult[] => {
  const usable = results.flatMap((result) =>
    isUsablePValue(result.pValue) ? [{ result, pValue: result.pValue }] : []
  );
  const adjusted = holmBonferroniAdjust(usable.map(({ pValue }) => pValue));
  const adjustedByRow = new Map(usable.map(({ result }, i) => [result, adjusted[i]]));

  return results.map((result) => ({
    ...result,
    adjustedPValue: adjustedByRow.get(result) ?? null,
  }));
};

/** The p-value significance should be judged on: adjusted when a correction was applied. */
export const getEffectivePValue = (result: CorrectableComparisonResult): number | null =>
  result.adjustedPValue !== undefined ? result.adjustedPValue : result.pValue;
