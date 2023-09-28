/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { criticalTableLookup } from './critical_table_lookup';
import type { Histogram } from './types';

/**
 * Compute the p-value for how similar the datasets are.
 * Returned value ranges from 0 to 1, with 1 meaning the datasets are identical.
 *
 * @param {Histogram[]} normalizedBaselineTerms - An array of normalized baseline terms (Histogram objects).
 * @param {Histogram[]} normalizedDriftedTerms - An array of normalized drifted terms (Histogram objects).
 * @returns {number} The p-value indicating the similarity of the datasets.
 */
export const computeChi2PValue = (
  normalizedBaselineTerms: Histogram[],
  normalizedDriftedTerms: Histogram[]
) => {
  // Get all unique keys from both arrays
  const allKeys: string[] = Array.from(
    new Set([
      ...normalizedBaselineTerms.map((term) => term.key.toString()),
      ...normalizedDriftedTerms.map((term) => term.key.toString()),
    ])
  ).slice(0, 100);

  // Calculate the chi-squared statistic and degrees of freedom
  let chiSquared: number = 0;
  const degreesOfFreedom: number = allKeys.length - 1;

  if (degreesOfFreedom === 0) return 1;

  allKeys.forEach((key) => {
    const baselineTerm = normalizedBaselineTerms.find((term) => term.key === key);
    const driftedTerm = normalizedDriftedTerms.find((term) => term.key === key);

    const observed: number = driftedTerm?.percentage ?? 0;
    const expected: number = baselineTerm?.percentage ?? 0;
    chiSquared += Math.pow(observed - expected, 2) / (expected > 0 ? expected : 1e-6); // Prevent divide by zero
  });

  // Use the criticalTableLookup function to determine the p-value
  return criticalTableLookup(chiSquared, degreesOfFreedom);
};
