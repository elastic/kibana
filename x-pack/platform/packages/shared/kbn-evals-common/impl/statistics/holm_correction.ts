/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComparisonResult } from '../schemas/experiments/compare_experiments_route.gen';

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
 *
 * Non-finite inputs (NaN, +/-Infinity) are not valid p-values: they are left out of the family,
 * so they do not inflate the correction, and come back as NaN at their positions.
 */
export const holmBonferroniAdjust = (pValues: readonly number[]): number[] => {
  const family = pValues
    .map((p, index) => ({ p, index }))
    .filter(({ p }) => Number.isFinite(p))
    .sort((a, b) => a.p - b.p);
  const m = family.length;

  const adjusted = new Array<number>(pValues.length).fill(NaN);
  let runningMax = 0;
  family.forEach(({ p, index }, rank) => {
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
