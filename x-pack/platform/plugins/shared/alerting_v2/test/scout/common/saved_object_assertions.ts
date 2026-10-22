/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The audit actors are the only attributes a patch leaves as `null`. An unsnooze can also write one
 * to `snoozedUntil`, which is why no spec using this helper may unsnooze.
 */
const NULLABLE_ROOT_FIELDS = new Set(['createdBy', 'updatedBy']);

/**
 * Dotted paths of every `null` reachable in a saved object's stored attributes, ignoring the audit
 * actors. Rules and action policies share one convention — a cleared field is a removed key, at
 * every depth — so an empty result is the invariant both resources have to hold.
 */
export const findNullPaths = (value: unknown, path: string[] = []): string[] => {
  if (value === null) {
    return [path.join('.')];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findNullPaths(item, [...path, String(index)]));
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !(path.length === 0 && NULLABLE_ROOT_FIELDS.has(key)))
      .flatMap(([key, child]) => findNullPaths(child, [...path, key]));
  }

  return [];
};
