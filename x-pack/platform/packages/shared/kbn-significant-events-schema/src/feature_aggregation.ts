/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isComputedFeature, normalizeFeatureSlug, type Feature } from './feature';

/**
 * A feature folded across sources: the representative's fields on top, every copy
 * (representative first) in `instances`.
 */
export type AggregatedFeature = Feature & { sources: string[]; instances: Feature[] };

const toTime = (value?: string): number => {
  const time = value ? Date.parse(value) : NaN;
  return Number.isNaN(time) ? 0 : time;
};

const compareRepresentative = (a: Feature, b: Feature): number =>
  b.confidence - a.confidence ||
  toTime(b.updated_at) - toTime(a.updated_at) ||
  a.source_id.localeCompare(b.source_id) ||
  a.uuid.localeCompare(b.uuid);

const foldKey = (feature: Feature): string =>
  `${feature.type}:${normalizeFeatureSlug(feature.id)}:${feature.excluded ? 'excluded' : 'active'}`;

/**
 * Folds per-source copies of a feature (from one space) into one row keyed on exact
 * `(type, slug, excluded)`.
 */
export function groupFeaturesAcrossSources(features: Feature[]): AggregatedFeature[] {
  // Computed features describe one source's data shape, so they never fold.
  const groups = new Map<string | Feature, Feature[]>();
  for (const feature of features) {
    const key = isComputedFeature(feature) ? feature : foldKey(feature);
    groups.set(key, [...(groups.get(key) ?? []), feature]);
  }

  return Array.from(groups.values(), (members) => {
    const ordered = [...members].sort(compareRepresentative);
    return {
      ...ordered[0],
      sources: Array.from(new Set(ordered.map(({ source_id: sourceId }) => sourceId))).sort(),
      instances: ordered,
    };
  });
}
