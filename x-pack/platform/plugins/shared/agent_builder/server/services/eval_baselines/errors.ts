/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A pin whose caller-stated score count doesn't match what the baseline would hold. Raised
 * before any pointer is published, so a pin issued while score export was still in flight
 * never becomes (or re-promotes) the active baseline.
 */
export class PinnedBaselineScoreCountMismatchError extends Error {
  constructor({
    baselineId,
    actualCount,
    expectedCount,
    stored,
  }: {
    baselineId: string;
    actualCount: number;
    expectedCount: number;
    stored: boolean;
  }) {
    super(
      `Baseline ${baselineId} would hold ${actualCount} score(s), but ${expectedCount} were ` +
        `expected. ` +
        (stored
          ? 'The stored snapshot is immutable; pin a different execution to publish a complete baseline.'
          : 'The run may not have finished exporting scores; retry once the export completed.')
    );
  }
}

export const assertExpectedScoreCount = ({
  baselineId,
  actualCount,
  expectedCount,
  stored,
}: {
  baselineId: string;
  actualCount: number;
  expectedCount: number | null | undefined;
  stored: boolean;
}): void => {
  if (expectedCount != null && actualCount !== expectedCount) {
    throw new PinnedBaselineScoreCountMismatchError({
      baselineId,
      actualCount,
      expectedCount,
      stored,
    });
  }
};
