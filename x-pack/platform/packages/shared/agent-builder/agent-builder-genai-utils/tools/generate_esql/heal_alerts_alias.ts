/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Rewrite the per-space security-alerts alias form
 * `.alerts-security.alerts-<space>` to the wildcard form
 * `.alerts-security.alerts-*` inside an ES|QL `FROM` clause.
 *
 * Why: ES|QL cannot resolve aliases as data sources. Quoting
 * `FROM .alerts-security.alerts-default` returns
 * `Unknown data source ".alerts-security.alerts-default"` even though
 * the alias resolves correctly via `_search`. The wildcard form
 * resolves to the underlying `.internal.alerts-security.alerts-*`
 * indices that ES|QL CAN read.
 *
 * The heal is intentionally narrow:
 *   - Only triggers on `FROM` (the only ES|QL source clause that takes
 *     a resource name; case-insensitive).
 *   - Only rewrites the `.alerts-security.alerts-<space>` form. The
 *     existing `.alerts-security.alerts-*` wildcard is preserved
 *     verbatim, and per-backing-index forms like
 *     `.internal.alerts-security.alerts-default-000001` are left alone.
 *   - Preserves an optional `cluster:` prefix.
 *   - The `<space>` segment must be a single non-empty token of safe
 *     characters (alphanumerics, underscore, hyphen). Empty segments
 *     and segments containing `*`, `,`, whitespace, or `|` are
 *     rejected — those would already match a different shape.
 *
 * Trace evidence motivating this heal: REPORT_ITER3.md /
 * `runs/v6_iter3/raw/rep[1245]_high-critical-prioritize.json`.
 * 4 of 5 reps generated `FROM .alerts-security.alerts-default` and
 * received `Unknown data source` errors; 1 of 5 generated the
 * wildcard form and succeeded.
 */
const ALIAS_HEAL_REGEX =
  /\bFROM\s+([\w-]+:)?\.alerts-security\.alerts-([A-Za-z0-9_-]+)(?=\b|\s|,|\||$)/gi;

const isWildcardSegment = (segment: string): boolean => segment === '*';

/**
 * Apply the alias→wildcard rewrite. No-op when the FROM clause already
 * targets the wildcard or some other non-alias form.
 *
 * Examples:
 *   `FROM .alerts-security.alerts-default | LIMIT 10`
 *   → `FROM .alerts-security.alerts-* | LIMIT 10`
 *
 *   `FROM .alerts-security.alerts-* | LIMIT 10` (already correct)
 *   → unchanged
 *
 *   `FROM .internal.alerts-security.alerts-default-000001` (backing index)
 *   → unchanged (does not match the alias regex anchored on
 *     `.alerts-security.alerts-`)
 */
export const healAlertsAliasInFromClause = (esql: string): string => {
  if (typeof esql !== 'string' || esql.length === 0) {
    return esql;
  }
  return esql.replace(ALIAS_HEAL_REGEX, (match, cluster, segment) => {
    if (isWildcardSegment(segment)) {
      return match;
    }
    return `FROM ${cluster ?? ''}.alerts-security.alerts-*`;
  });
};
