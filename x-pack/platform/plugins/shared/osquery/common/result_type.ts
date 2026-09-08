/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The result collection mode for an osquery query. Maps to the two-boolean
 * wire encoding ({@link mapResultTypeToWire}) at the Fleet emit boundary.
 *
 * - `'snapshot'`: collect the full current state (osquerybeat default).
 * - `'differential'`: collect only changed rows (added and removed).
 * - `'differential_added_only'`: collect only added rows (ignore removals).
 *
 * The underlying wire shape is `{ snapshot: false, removed: <boolean> }` for
 * the two differential modes; the snapshot mode emits nothing (preserving the
 * osquerybeat default of `snapshot: true` when no key is present).
 */
export type ResultType = 'snapshot' | 'differential' | 'differential_added_only';

export const RESULT_TYPES: ResultType[] = ['snapshot', 'differential', 'differential_added_only'];

/**
 * Maps a {@link ResultType} to the wire-level `{ snapshot, removed }` boolean
 * pair expected by osquerybeat. Returns an empty object for `'snapshot'` so
 * the absence-means-snapshot convention is preserved.
 */
export const mapResultTypeToWire = (
  resultType: ResultType
): { snapshot?: boolean; removed?: boolean } => {
  if (resultType === 'differential') {
    return { snapshot: false, removed: true };
  }

  if (resultType === 'differential_added_only') {
    return { snapshot: false, removed: false };
  }

  // 'snapshot' → emit nothing; osquerybeat defaults to snapshot: true
  return {};
};
