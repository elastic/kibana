/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_RESOLVE_INDEX_PATTERN_LENGTH = 1024;
export const MAX_RESOLVE_INDEX_PATTERNS = 32;

export interface ResolvedIndexPatternMatches {
  data_streams?: Array<{ name: string }>;
  indices?: Array<{ name: string }>;
}

/**
 * User-facing names from `_resolve/index`: data streams plus non-hidden indices.
 * Backing `.ds-*` indices are omitted.
 */
export const collectResolvedIndexNames = (resolved: ResolvedIndexPatternMatches): string[] => {
  const names = new Set<string>();
  for (const dataStream of resolved.data_streams ?? []) {
    names.add(dataStream.name);
  }
  for (const index of resolved.indices ?? []) {
    if (!index.name.startsWith('.')) {
      names.add(index.name);
    }
  }
  return [...names].sort((left, right) => left.localeCompare(right));
};

export const collectResolvedDataStreamNames = (resolved: ResolvedIndexPatternMatches): string[] =>
  [...new Set((resolved.data_streams ?? []).map((dataStream) => dataStream.name))].sort(
    (left, right) => left.localeCompare(right)
  );
