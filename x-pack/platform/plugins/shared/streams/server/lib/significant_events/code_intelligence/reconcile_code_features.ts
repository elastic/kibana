/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type BaseFeature,
  type Feature,
  type FeatureUpsert,
  mergeFeature,
  normalizeFeatureSlug,
  toBaseFeature,
} from '@kbn/significant-events-schema';

/**
 * Reconciles incoming code-derived features against whatever already exists at
 * the same deterministic UUID (i.e. same slug + type on the stream), which may
 * be a log-derived feature. `mergeFeature` unions evidence, blends confidence,
 * and merges properties/meta so a KI can carry both code and log evidence. The
 * existing feature's exclusion state is preserved.
 */
export function reconcileCodeFeatures({
  incoming,
  existing,
  runId,
}: {
  incoming: FeatureUpsert[];
  existing: Feature[];
  runId: string;
}): FeatureUpsert[] {
  const existingBySlug = new Map<string, Feature>();
  for (const feature of existing) {
    existingBySlug.set(normalizeFeatureSlug(feature.id), feature);
  }

  return incoming.map((feature) => {
    const match = existingBySlug.get(normalizeFeatureSlug(feature.id));
    if (!match) {
      return { ...feature, run_id: runId };
    }

    const merged: BaseFeature = mergeFeature(toBaseFeature(match), feature);
    return {
      ...merged,
      run_id: runId,
      excluded: match.excluded,
    };
  });
}
