/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Which samples of a dataset to evaluate: the listed ones, every one, or the first few. */
export interface SampleSelection {
  /** Sample ids; when set, the preset, `all_samples` and `sample_count` are ignored. */
  samples: string[];
  /** A named list of sample ids from `presets`, so runs across the team use the same ones. */
  preset?: string;
  presets: Record<string, string[]>;
  all_samples: boolean;
  sample_count: number;
}

/** The sample ids a selection lists, its own or its preset's; empty when it lists none. */
const listedSampleIds = (
  { samples, preset, presets }: Pick<SampleSelection, 'samples' | 'preset' | 'presets'>,
  dataset: string
): string[] => {
  if (samples.length === 0 && preset && !presets[preset]) {
    throw new Error(
      `${dataset} has no preset '${preset}'; presets: ${Object.keys(presets).join(', ') || 'none'}`
    );
  }
  return samples.length > 0 ? samples : preset ? presets[preset] : [];
};

/**
 * The samples a selection picks from `candidates`, the samples the dataset can evaluate. Listed
 * ids may also name samples outside `candidates`, such as abstention questions, from `all`.
 */
export const pickSamples = <T>(
  candidates: T[],
  all: T[],
  idOf: (sample: T) => string,
  { samples, preset, presets, all_samples: everything, sample_count: count }: SampleSelection,
  dataset: string
): T[] => {
  const ids = listedSampleIds({ samples, preset, presets }, dataset);
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

/**
 * The samples a selection picks from a stream of samples, keeping only those: for datasets too
 * large to hold. It stops reading once it has every listed sample, or the first `sample_count`.
 * `isCandidate` tells the samples the dataset can evaluate; listed ids may name any sample.
 */
export const pickSamplesFromStream = async <T>(
  samples: AsyncIterable<T>,
  isCandidate: (sample: T) => boolean,
  idOf: (sample: T) => string,
  selection: SampleSelection,
  dataset: string
): Promise<T[]> => {
  const ids = listedSampleIds(selection, dataset);
  if (ids.length > 0) {
    const wanted = new Set(ids);
    const found = new Map<string, T>();
    for await (const sample of samples) {
      if (wanted.has(idOf(sample))) {
        found.set(idOf(sample), sample);
        if (found.size === wanted.size) {
          break;
        }
      }
    }
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length > 0) {
      throw new Error(`${dataset} has no samples ${missing.join(', ')}`);
    }
    return ids.flatMap((id) => found.get(id) ?? []);
  }
  const picked: T[] = [];
  for await (const sample of samples) {
    if (isCandidate(sample)) {
      picked.push(sample);
      if (!selection.all_samples && picked.length >= selection.sample_count) {
        break;
      }
    }
  }
  return picked;
};
