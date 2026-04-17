/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type KISource = 'canonical' | 'snapshot' | 'auto';
type KISourceInput = KISource | 'both';

/**
 * Resolves which KI source variants to run for KI query generation evaluation.
 *
 * - `canonical`: Uses hand-crafted KIs derived from the scenario's
 *   `expected_ground_truth`. Provides a deterministic baseline that is
 *   independent of the LLM feature extraction step.
 * - `snapshot`: Uses KIs that were previously extracted by the LLM and
 *   persisted in the snapshot (loaded from `sigevents-streams-features-*`
 *   indices). Reflects real end-to-end behaviour.
 * - `auto`: Prefers `canonical` when an `expected_ground_truth` is available,
 *   otherwise falls back to `snapshot`.
 * - `both` (default): Runs `canonical` and `snapshot` side-by-side so results
 *   are directly comparable.
 */
const resolveKISourcesToRun = (source: KISourceInput | string | undefined): KISource[] => {
  if (source == null || source === 'both') {
    return ['canonical', 'snapshot'];
  }

  if (source === 'canonical' || source === 'snapshot' || source === 'auto') {
    return [source];
  }

  return ['auto'];
};

/**
 * KI source variants to run.
 *
 * Controlled by `KI_QUERY_GENERATION_KI_FEATURE_SOURCE`. For backwards compatibility,
 * `SIGEVENTS_QUERYGEN_FEATURES_SOURCE` is also supported.
 * When unset, defaults to `['canonical', 'snapshot']` (i.e. `both`).
 */
export const KI_FEATURE_SOURCES_TO_RUN = resolveKISourcesToRun(
  process.env.KI_QUERY_GENERATION_KI_FEATURE_SOURCE ||
    process.env.SIGEVENTS_QUERYGEN_FEATURES_SOURCE
);
