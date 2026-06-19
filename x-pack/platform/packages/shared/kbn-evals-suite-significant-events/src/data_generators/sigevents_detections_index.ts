/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeIndexComponent } from './sanitize_index_component';

const SIGEVENTS_DETECTIONS_INDEX_PREFIX = 'sigevents-detections-';

/**
 * Name of the non-system index that stores captured detection documents for a
 * given snapshot scenario.
 *
 * We intentionally keep this as a **regular** index (no leading `.`) so it can
 * be included in snapshots via the `indices` parameter.
 */
export function getSigeventsSnapshotDetectionsIndex(snapshotName: string): string {
  const component = sanitizeIndexComponent(snapshotName) || 'unknown';
  return `${SIGEVENTS_DETECTIONS_INDEX_PREFIX}${component}`;
}
