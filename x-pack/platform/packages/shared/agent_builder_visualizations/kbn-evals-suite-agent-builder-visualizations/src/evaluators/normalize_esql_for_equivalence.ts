/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Strip redundant time-picker `?_tstart`/`?_tend` WHERE bounds before FuncEq
 * so cosmetic presence/absence of that filter does not move scores. By default
 * only `@timestamp` bounds are stripped: Kibana filters `@timestamp` on its own,
 * but a query on any other event-time field (`order_date`, …) ignores the time
 * picker without them. Handles a standalone WHERE pipe and leading/middle/trailing
 * conjuncts.
 */

// Unquoted `order_date` / `@timestamp`, or backtick-quoted `` `Order Date` ``.
const ANY_TIME_FIELD = String.raw`(?:\`[^\`]+\`|@?[A-Za-z_][\w.]*)`;
const TIMESTAMP_FIELD = String.raw`(?:\`@timestamp\`|@timestamp)`;

const buildTimeBoundConjunct = (timeField: string): string =>
  String.raw`(?:${timeField}\s*(?:>=|>)\s*\?_tstart\s+AND\s+${timeField}\s*(?:<=|<)\s*\?_tend|${timeField}\s*(?:<=|<)\s*\?_tend\s+AND\s+${timeField}\s*(?:>=|>)\s*\?_tstart)`;

interface NormalizeEsqlOptions {
  /** Also strip bounds on date fields other than `@timestamp`. */
  anyTimeField?: boolean;
}

export function stripRedundantTimeBindBounds(
  query: string,
  { anyTimeField = false }: NormalizeEsqlOptions = {}
): string {
  if (!query || typeof query !== 'string') {
    return query;
  }

  const timeBoundConjunct = buildTimeBoundConjunct(anyTimeField ? ANY_TIME_FIELD : TIMESTAMP_FIELD);
  let normalized = query;

  normalized = normalized.replace(
    new RegExp(String.raw`\|\s*WHERE\s+${timeBoundConjunct}\s*(?=\||$)`, 'gi'),
    ''
  );

  normalized = normalized.replace(
    new RegExp(String.raw`(\|\s*WHERE\s+)${timeBoundConjunct}\s+AND\s+`, 'gi'),
    '$1'
  );

  // Middle before trailing so nested AND chains reduce correctly.
  normalized = normalized.replace(
    new RegExp(String.raw`(\|\s*WHERE\s+.+?)\s+AND\s+${timeBoundConjunct}\s+AND\s+`, 'gis'),
    '$1 AND '
  );

  normalized = normalized.replace(
    new RegExp(String.raw`(\|\s*WHERE\s+.+?)\s+AND\s+${timeBoundConjunct}(?=\s*(?:\||$))`, 'gis'),
    '$1'
  );

  return normalized;
}

export function normalizeEsqlForEquivalence(query: string, options?: NormalizeEsqlOptions): string {
  return stripRedundantTimeBindBounds(query, options).trim();
}
