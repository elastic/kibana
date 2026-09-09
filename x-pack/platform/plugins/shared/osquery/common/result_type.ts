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

/**
 * Inverse of {@link mapResultTypeToWire}: decodes the legacy
 * `{ snapshot, removed }` boolean pair into a canonical {@link ResultType}.
 *
 * Returns `undefined` when neither boolean is stored, which is how a query
 * that never carried an explicit result type is distinguished from one that
 * explicitly stores snapshot mode. Callers use that distinction to tell an
 * inheriting query from an overriding one.
 *
 * `snapshot: true` wins over `removed` because osquerybeat ignores `removed`
 * in snapshot mode.
 */
export const mapWireToResultType = (wire: {
  snapshot?: boolean;
  removed?: boolean;
}): ResultType | undefined => {
  const { snapshot, removed } = wire;

  if (snapshot === undefined && removed === undefined) {
    return undefined;
  }

  if (snapshot !== false) {
    return 'snapshot';
  }

  return removed ? 'differential' : 'differential_added_only';
};

/**
 * Decodes a stored `{ snapshot, removed }` pair into a result type *only* when
 * that pair represents a deliberate per-query choice, and returns `undefined`
 * otherwise so the caller falls back to the pack-level default.
 *
 * This is deliberately narrower than {@link mapWireToResultType}, which is the
 * faithful inverse of the wire encoding and is what the *display* path wants: a
 * query storing `snapshot: true` should still render as Snapshot.
 *
 * The distinction exists because `snapshot: true, removed: false` is not
 * evidence of a choice. Before pack-level defaults, the query flyout seeded
 * exactly that pair into every newly created query and the serializer never
 * stripped it, so effectively every pack query already on disk carries it.
 * Treating it as an explicit override would mean a curator setting a pack-level
 * result type saw it apply to nothing — the pack default would be outranked on
 * every pre-existing query, with no way to tell from the UI why.
 *
 * `snapshot === false` is the opposite case: nothing ever wrote it implicitly,
 * so it is a genuine differential query and must keep winning over the pack
 * default (otherwise introducing a pack-level Snapshot default would silently
 * convert real differential queries, changing what ships on the agent wire).
 *
 * Trade-off: a query a user deliberately set to Snapshot before V5 is
 * indistinguishable from the seed, so it will follow a pack-level Differential
 * default. That is accepted — the pack default is an explicit, visible action,
 * and the per-query override toggle can restore Snapshot for that query.
 */
export const mapWireToExplicitResultType = (wire: {
  snapshot?: boolean;
  removed?: boolean;
}): ResultType | undefined => {
  if (wire.snapshot !== false) {
    return undefined;
  }

  return mapWireToResultType(wire);
};
