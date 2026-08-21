/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetConfig } from '../../src/datasets';

/**
 * Resolves which KI query-generation scenarios to run.
 *
 * Controlled by `KI_QUERY_GENERATION_SCENARIOS` (comma-separated scenario ids).
 * When unset, every scenario of every active dataset runs. Requested ids are
 * validated against the union of scenarios across the active datasets, and
 * datasets that contain no selected scenario are dropped.
 */
export const resolveQueryGenerationDatasets = (
  datasets: DatasetConfig[],
  rawSelection = process.env.KI_QUERY_GENERATION_SCENARIOS
): DatasetConfig[] => {
  if (rawSelection == null || rawSelection.trim() === '') {
    return datasets;
  }

  const requested = [...new Set(rawSelection.split(',').map((item) => item.trim()))];
  if (requested.some((item) => item.length === 0)) {
    throw new Error(
      'KI_QUERY_GENERATION_SCENARIOS contains an empty item; expected a comma-separated list of scenario ids.'
    );
  }

  const available = [
    ...new Set(
      datasets.flatMap((dataset) =>
        dataset.kiQueryGeneration.map((scenario) => scenario.input.scenario_id)
      )
    ),
  ];
  const unknown = requested.filter((id) => !available.includes(id));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown KI query generation scenario(s): ${unknown.join(', ')}. ` +
        `Available: ${available.join(', ')}.`
    );
  }

  return datasets
    .map((dataset) => ({
      ...dataset,
      kiQueryGeneration: dataset.kiQueryGeneration.filter((scenario) =>
        requested.includes(scenario.input.scenario_id)
      ),
    }))
    .filter((dataset) => dataset.kiQueryGeneration.length > 0);
};
