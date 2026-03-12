/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const SIGEVENTS_FEATURES_INDEX_PREFIX = 'sigevents-streams-features-';

export const SIGEVENTS_FEATURES_INDEX_PATTERN = `${SIGEVENTS_FEATURES_INDEX_PREFIX}*`;

function sanitizeIndexComponent(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Name of the non-system index that stores extracted features for a
 * given snapshot scenario.
 *
 * We intentionally keep this as a **regular** index (no leading `.`) so it can
 * be included in snapshots via the `indices` parameter.
 */
export function getSigeventsSnapshotFeaturesIndex(snapshotName: string): string {
  const component = sanitizeIndexComponent(snapshotName) || 'unknown';
  return `${SIGEVENTS_FEATURES_INDEX_PREFIX}${component}`;
}
