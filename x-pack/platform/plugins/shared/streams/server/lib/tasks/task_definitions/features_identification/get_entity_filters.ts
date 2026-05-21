/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureWithFilter } from '@kbn/streams-schema';
import type { Condition } from '@kbn/streamlang';

export function getEntityFilters(features: FeatureWithFilter[], maxFilters: number): Condition[] {
  if (features.length === 0) {
    return [];
  }

  // Cap by recency: when `features.length > maxFilters` we want to keep the
  // freshest entities (those still active in the current sampling window) so
  // their negative filters actually subtract documents from the entity-filtered
  // bucket. ISO timestamps sort lexicographically, so `localeCompare` on
  // `updated_at` desc gives newest-first. Missing `updated_at` (shouldn't
  // happen in practice — `kiClient.getFeatures` always populates it) sorts last.
  const capped = [...features]
    .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
    .slice(0, maxFilters);
  return capped.map(({ filter }) => filter);
}
