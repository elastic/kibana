/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

import type { DatasetConfig } from '../../src/datasets';

export interface QueryGenerationDatasetResolution {
  /** Active datasets with query-generation scenarios filtered to the selection. */
  datasets: DatasetConfig[];
  /** True when a scenario filter (KI_QUERY_GENERATION_SCENARIOS) was requested. */
  isFocused: boolean;
  /** Sorted, deduplicated scenario ids: the union for full runs, the selection for focused runs. */
  selectedScenarioIds: string[];
}

const parseSelection = (rawSelection: string | undefined): string[] => {
  if (rawSelection == null || rawSelection.trim() === '') {
    return [];
  }
  const requested = rawSelection.split(',').map((item) => item.trim());
  if (requested.some((item) => item.length === 0)) {
    throw new Error(
      'KI_QUERY_GENERATION_SCENARIOS contains an empty item; expected a comma-separated list of scenario ids.'
    );
  }
  return [...new Set(requested)];
};

const collectScenarioIds = (datasets: DatasetConfig[]): string[] => [
  ...new Set(
    datasets.flatMap((dataset) =>
      dataset.kiQueryGeneration.map((scenario) => scenario.input.scenario_id)
    )
  ),
];

/**
 * Resolves which KI query-generation scenarios to run.
 *
 * Controlled by `KI_QUERY_GENERATION_SCENARIOS` (comma-separated scenario ids).
 * When unset, every scenario of every active dataset runs. Requested ids are
 * validated against the union of scenarios across the active datasets, and
 * datasets that contain no selected scenario are dropped.
 *
 * Returns selection metadata so the spec can distinguish a full run from a
 * focused run and give focused runs a namespaced dataset name instead of
 * overwriting the canonical Golden dataset with a pruned example set.
 */
export const resolveQueryGenerationDatasets = (
  datasets: DatasetConfig[],
  rawSelection = process.env.KI_QUERY_GENERATION_SCENARIOS
): QueryGenerationDatasetResolution => {
  const requested = parseSelection(rawSelection);
  const isFocused = requested.length > 0;

  if (!isFocused) {
    return {
      datasets,
      isFocused,
      selectedScenarioIds: collectScenarioIds(datasets).sort(),
    };
  }

  const available = collectScenarioIds(datasets);
  const unknown = requested.filter((id) => !available.includes(id));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown KI query generation scenario(s): ${unknown.join(', ')}. ` +
        `Available: ${available.join(', ')}.`
    );
  }

  const resolvedDatasets = datasets
    .map((dataset) => ({
      ...dataset,
      kiQueryGeneration: dataset.kiQueryGeneration.filter((scenario) =>
        requested.includes(scenario.input.scenario_id)
      ),
    }))
    .filter((dataset) => dataset.kiQueryGeneration.length > 0);

  return {
    datasets: resolvedDatasets,
    isFocused,
    selectedScenarioIds: [...requested].sort(),
  };
};

/**
 * Determines the dataset name used to store a query-generation run.
 *
 * Unfiltered (full) runs keep the canonical name verbatim so the Golden dataset
 * keeps its complete example set. Focused runs get a compact deterministic
 * namespaced suffix: the SHA-256 of the sorted scenario ids truncated to 12 hex
 * characters. Selection order and duplicates produce the same hash, different
 * selections produce different names, and the result never collides with the
 * canonical name. The readable scenario list belongs in the dataset description.
 */
export const resolveQueryGenerationDatasetName = (
  resolution: QueryGenerationDatasetResolution,
  canonicalName: string
): string => {
  if (!resolution.isFocused) {
    return canonicalName;
  }
  const hash = createHash('sha256').update(resolution.selectedScenarioIds.join('|')).digest('hex');
  return `${canonicalName} [focused:${hash.slice(0, 12)}]`;
};

/**
 * Prevents focused runs from reading or replacing a canonical upstream dataset.
 */
export const assertQueryGenerationDatasetSafety = (
  resolution: QueryGenerationDatasetResolution,
  trustUpstreamDataset: boolean
): void => {
  if (resolution.isFocused && trustUpstreamDataset) {
    throw new Error(
      'KI_QUERY_GENERATION_SCENARIOS cannot be combined with SIGEVENTS_TRUST_UPSTREAM=true: ' +
        'focused runs use a namespaced dataset and must never resolve or overwrite the canonical ' +
        'upstream dataset. Unset KI_QUERY_GENERATION_SCENARIOS for trust-upstream runs.'
    );
  }
};
