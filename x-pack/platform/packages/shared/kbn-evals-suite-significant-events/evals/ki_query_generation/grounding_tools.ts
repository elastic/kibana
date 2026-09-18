/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type GroundingMode = 'baseline' | 'grounded';

/** Resolves the grounding modes to run from `KI_QUERY_GENERATION_GROUNDING` (off|on|both). */
export const resolveGroundingModes = (): GroundingMode[] => {
  switch ((process.env.KI_QUERY_GENERATION_GROUNDING ?? 'off').toLowerCase()) {
    case 'on':
      return ['grounded'];
    case 'both':
      return ['baseline', 'grounded'];
    case 'off':
    default:
      return ['baseline'];
  }
};

const readDatasetValue = (
  datasetId: string,
  mapEnvVar: string,
  singleEnvVar: string
): string | undefined => {
  const mapRaw = process.env[mapEnvVar];
  if (mapRaw) {
    try {
      const map = JSON.parse(mapRaw) as Record<string, string>;
      if (typeof map[datasetId] === 'string' && map[datasetId].length > 0) {
        return map[datasetId];
      }
    } catch {
      // ignore malformed map and fall through to the single-value fallback
    }
  }
  const single = process.env[singleEnvVar];
  return single && single.length > 0 ? single : undefined;
};

/**
 * Resolves the SCS `repository` label (e.g. "open-telemetry/opentelemetry-demo") for a dataset.
 * Reads a per-dataset JSON map from `KI_QUERY_GENERATION_REPOSITORIES` and falls back to a single
 * `KI_QUERY_GENERATION_REPOSITORY` for all datasets.
 */
export const resolveRepositoryForDataset = (datasetId: string): string | undefined =>
  readDatasetValue(datasetId, 'KI_QUERY_GENERATION_REPOSITORIES', 'KI_QUERY_GENERATION_REPOSITORY');
