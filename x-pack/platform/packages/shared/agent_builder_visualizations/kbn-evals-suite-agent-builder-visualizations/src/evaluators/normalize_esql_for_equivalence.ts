/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Strip redundant time-picker `?_tstart`/`?_tend` WHERE bounds before FuncEq
 * so cosmetic presence/absence of that filter does not move scores. Applies to
 * any event-time field (`@timestamp`, `order_date`, …). Handles a standalone
 * WHERE pipe and leading/middle/trailing conjuncts.
 */

// Unquoted `order_date` / `@timestamp`, or backtick-quoted `` `Order Date` ``.
const TIME_FIELD = String.raw`(?:\`[^\`]+\`|@?[A-Za-z_][\w.]*)`;
const TIME_BOUND_CONJUNCT = String.raw`(?:${TIME_FIELD}\s*(?:>=|>)\s*\?_tstart\s+AND\s+${TIME_FIELD}\s*(?:<=|<)\s*\?_tend|${TIME_FIELD}\s*(?:<=|<)\s*\?_tend\s+AND\s+${TIME_FIELD}\s*(?:>=|>)\s*\?_tstart)`;

export function stripRedundantTimestampBindBounds(query: string): string {
  if (!query || typeof query !== 'string') {
    return query;
  }

  let normalized = query;

  normalized = normalized.replace(
    new RegExp(String.raw`\|\s*WHERE\s+${TIME_BOUND_CONJUNCT}\s*(?=\||$)`, 'gi'),
    ''
  );

  normalized = normalized.replace(
    new RegExp(String.raw`(\|\s*WHERE\s+)${TIME_BOUND_CONJUNCT}\s+AND\s+`, 'gi'),
    '$1'
  );

  // Middle before trailing so nested AND chains reduce correctly.
  normalized = normalized.replace(
    new RegExp(String.raw`(\|\s*WHERE\s+.+?)\s+AND\s+${TIME_BOUND_CONJUNCT}\s+AND\s+`, 'gis'),
    '$1 AND '
  );

  normalized = normalized.replace(
    new RegExp(String.raw`(\|\s*WHERE\s+.+?)\s+AND\s+${TIME_BOUND_CONJUNCT}(?=\s*(?:\||$))`, 'gis'),
    '$1'
  );

  return normalized;
}

export function normalizeEsqlForEquivalence(query: string): string {
  return stripRedundantTimestampBindBounds(query).trim();
}
