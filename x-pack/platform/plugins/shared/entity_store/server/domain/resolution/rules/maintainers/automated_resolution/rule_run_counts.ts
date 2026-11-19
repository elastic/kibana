/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RuleRunCounts {
  links_created: number;
  skipped_ambiguous: number;
  skipped_oversized: number;
  skipped_noop: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The first of several possible field names that holds a number; rules store different shapes. */
const firstNumber = (source: Record<string, unknown>, keys: string[]): number => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number') {
      return value;
    }
  }
  return 0;
};

/** Reads what a rule did in its last run, whichever shape that rule saves. */
export const readRunCounts = (lastRun: unknown): RuleRunCounts | undefined =>
  isRecord(lastRun)
    ? {
        links_created: firstNumber(lastRun, ['resolutionsCreated', 'linksCreated']),
        skipped_ambiguous: firstNumber(lastRun, ['skippedAmbiguousBuckets', 'skippedAmbiguous']),
        skipped_oversized: firstNumber(lastRun, ['skippedOversizedBuckets']),
        skipped_noop: firstNumber(lastRun, ['skippedNoopBuckets']),
      }
    : undefined;
