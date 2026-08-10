/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Strip redundant `@timestamp` `?_tstart`/`?_tend` WHERE bounds before FuncEq
 * so cosmetic presence/absence of that filter does not move scores. Handles a
 * standalone WHERE pipe and leading/middle/trailing conjuncts.
 */

const TIMESTAMP_FIELD = '`?@timestamp`?';
const TIMESTAMP_BOUND_CONJUNCT = String.raw`(?:${TIMESTAMP_FIELD}\s*(?:>=|>)\s*\?_tstart\s+AND\s+${TIMESTAMP_FIELD}\s*(?:<=|<)\s*\?_tend|${TIMESTAMP_FIELD}\s*(?:<=|<)\s*\?_tend\s+AND\s+${TIMESTAMP_FIELD}\s*(?:>=|>)\s*\?_tstart)`;

export function stripRedundantTimestampBindBounds(query: string): string {
  if (!query || typeof query !== 'string') {
    return query;
  }

  let normalized = query;

  normalized = normalized.replace(
    new RegExp(String.raw`\|\s*WHERE\s+${TIMESTAMP_BOUND_CONJUNCT}\s*(?=\||$)`, 'gi'),
    ''
  );

  normalized = normalized.replace(
    new RegExp(String.raw`(\|\s*WHERE\s+)${TIMESTAMP_BOUND_CONJUNCT}\s+AND\s+`, 'gi'),
    '$1'
  );

  // Middle before trailing so nested AND chains reduce correctly.
  normalized = normalized.replace(
    new RegExp(String.raw`(\|\s*WHERE\s+.+?)\s+AND\s+${TIMESTAMP_BOUND_CONJUNCT}\s+AND\s+`, 'gis'),
    '$1 AND '
  );

  normalized = normalized.replace(
    new RegExp(
      String.raw`(\|\s*WHERE\s+.+?)\s+AND\s+${TIMESTAMP_BOUND_CONJUNCT}(?=\s*(?:\||$))`,
      'gis'
    ),
    '$1'
  );

  return normalized;
}

export function normalizeEsqlForEquivalence(query: string): string {
  return stripRedundantTimestampBindBounds(query).trim();
}
