/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Semantic Code Search (SCS) grounding configuration for the KI query
 * generation eval. Grounded runs rely on the SCS Agent Builder tools exposed
 * to the deployed KI query generation agent; this module only resolves which
 * grounding modes to run and which code index backs each dataset.
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

/**
 * Resolves the SCS code index for a dataset. Reads a per-dataset JSON map from
 * `KI_QUERY_GENERATION_CODE_INDICES` (e.g. {"otel-demo":"code-open-telemetry_opentelemetry-demo"})
 * and falls back to a single `KI_QUERY_GENERATION_CODE_INDEX` for all datasets.
 */
export const resolveCodeIndexForDataset = (datasetId: string): string | undefined => {
  const mapRaw = process.env.KI_QUERY_GENERATION_CODE_INDICES;
  if (mapRaw) {
    try {
      const map = JSON.parse(mapRaw) as Record<string, string>;
      if (typeof map[datasetId] === 'string' && map[datasetId].length > 0) {
        return map[datasetId];
      }
    } catch {
      // ignore malformed map and fall through to single-index fallback
    }
  }
  const single = process.env.KI_QUERY_GENERATION_CODE_INDEX;
  return single && single.length > 0 ? single : undefined;
};
