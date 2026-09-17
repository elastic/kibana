/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface SplitExample {
  metadata?: {
    dataset_split?: readonly string[];
    status?: string;
  } | null;
}

/** Selects active examples that belong to every requested split, failing on an empty selection. */
export const selectDatasetExamples = <TExample extends SplitExample>(
  examples: readonly TExample[],
  splits: readonly string[]
): TExample[] => {
  const selected = examples.filter(
    ({ metadata }) =>
      metadata?.status !== 'archived' &&
      splits.every((split) => metadata?.dataset_split?.includes(split))
  );
  if (selected.length === 0) {
    throw new Error(`No active examples match ${splits.join(' AND ') || 'whole dataset'}`);
  }
  return selected;
};
