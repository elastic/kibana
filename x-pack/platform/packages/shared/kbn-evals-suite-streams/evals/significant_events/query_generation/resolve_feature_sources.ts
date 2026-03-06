/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type FeatureSource = 'canonical' | 'snapshot' | 'auto';
type FeatureSourceInput = FeatureSource | 'both';

/**
 * Resolves which feature source variants to run for query generation evaluation.
 *
 * - `canonical`: Uses hand-crafted features derived from the scenario's
 *   `expected_ground_truth`. Provides a deterministic baseline that is
 *   independent of the LLM feature-extraction step.
 * - `snapshot`: Uses features that were previously extracted by the LLM and
 *   persisted in the snapshot (loaded from `sigevents-streams-features-*`
 *   indices). Reflects real end-to-end behaviour.
 * - `auto`: Prefers `canonical` when an `expected_ground_truth` is available,
 *   otherwise falls back to `snapshot`.
 * - `both` (default): Runs `canonical` and `snapshot` side-by-side so results
 *   are directly comparable.
 */
const resolveFeatureSourcesToRun = (
  source: FeatureSourceInput | string | undefined
): FeatureSource[] => {
  if (source == null || source === 'both') {
    return ['canonical', 'snapshot'];
  }

  if (source === 'canonical' || source === 'snapshot' || source === 'auto') {
    return [source];
  }

  return ['auto'];
};

/**
 * Feature source variants to run, controlled by `SIGEVENTS_QUERYGEN_FEATURES_SOURCE`.
 * When unset, defaults to `['canonical', 'snapshot']` (i.e. `both`).
 */
export const FEATURE_SOURCES_TO_RUN = resolveFeatureSourcesToRun(
  process.env.SIGEVENTS_QUERYGEN_FEATURES_SOURCE
);
