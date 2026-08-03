/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Normalize ES|QL before functional equivalence so cosmetic time-bound
 * differences do not move scores.
 *
 * Agent-authored visualization queries often encode the dashboard time
 * window only via `BUCKET(@timestamp, …, ?_tstart, ?_tend)` /
 * `TBUCKET(…, ?_tstart, ?_tend)`, while gold examples also include an
 * explicit `| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend`.
 * For `@timestamp`-bounded viz queries those forms are equivalent for
 * evaluation purposes — strip the redundant WHERE so the LLM judge
 * compares the same logical query.
 */

/** Match `@timestamp` (optionally backticked). */
const TIMESTAMP_FIELD = '`?@timestamp`?';

/**
 * A conjunct that only constrains `@timestamp` to the eval bind params
 * (`?_tstart` / `?_tend`), in either order / inequality flavour the gold
 * and agents commonly emit.
 */
const TIMESTAMP_BOUND_CONJUNCT = String.raw`(?:${TIMESTAMP_FIELD}\s*(?:>=|>)\s*\?_tstart\s+AND\s+${TIMESTAMP_FIELD}\s*(?:<=|<)\s*\?_tend|${TIMESTAMP_FIELD}\s*(?:<=|<)\s*\?_tend\s+AND\s+${TIMESTAMP_FIELD}\s*(?:>=|>)\s*\?_tstart)`;

/**
 * Strip `@timestamp` range filters that only restate `?_tstart` / `?_tend`.
 *
 * Handles:
 * - a standalone `| WHERE <bounds>` pipe (removed entirely)
 * - a leading / trailing / middle conjunct inside a broader `WHERE`
 *   (the bounds conjunct is removed; other predicates stay)
 */
export function stripRedundantTimestampBindBounds(query: string): string {
  if (!query || typeof query !== 'string') {
    return query;
  }

  let normalized = query;

  // Standalone pipe: `| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend`
  // Leave the preceding newline intact so the next pipe stays on its own line.
  normalized = normalized.replace(
    new RegExp(String.raw`\|\s*WHERE\s+${TIMESTAMP_BOUND_CONJUNCT}\s*(?=\||$)`, 'gi'),
    ''
  );

  // Leading conjunct: `WHERE <bounds> AND <rest>` → `WHERE <rest>`
  normalized = normalized.replace(
    new RegExp(String.raw`(\|\s*WHERE\s+)${TIMESTAMP_BOUND_CONJUNCT}\s+AND\s+`, 'gi'),
    '$1'
  );

  // Trailing conjunct: `WHERE <rest> AND <bounds>` → `WHERE <rest>`
  normalized = normalized.replace(
    new RegExp(
      String.raw`(\|\s*WHERE\s+.+?)\s+AND\s+${TIMESTAMP_BOUND_CONJUNCT}(?=\s*(?:\||$))`,
      'gi'
    ),
    '$1'
  );

  return normalized;
}

/**
 * Normalize a gold or candidate ES|QL string before equivalence scoring.
 */
export function normalizeEsqlForEquivalence(query: string): string {
  return stripRedundantTimestampBindBounds(query).trim();
}
