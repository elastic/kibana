/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Which samples of a dataset to evaluate: the listed ones, every one, or the first few. */
export interface SampleSelection {
  /** Sample ids; when set, `all_samples` and `sample_count` are ignored. */
  samples: string[];
  all_samples: boolean;
  sample_count: number;
}

/**
 * The samples a selection picks from `candidates`, the samples the dataset can evaluate. Listed
 * ids may also name samples outside `candidates`, such as abstention questions, from `all`.
 */
export const pickSamples = <T>(
  candidates: T[],
  all: T[],
  idOf: (sample: T) => string,
  { samples: ids, all_samples: everything, sample_count: count }: SampleSelection,
  dataset: string
): T[] => {
  if (ids.length > 0) {
    const byId = new Map(all.map((sample) => [idOf(sample), sample]));
    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      throw new Error(`${dataset} has no samples ${missing.join(', ')}`);
    }
    return ids.flatMap((id) => byId.get(id) ?? []);
  }
  return everything ? candidates : candidates.slice(0, count);
};
