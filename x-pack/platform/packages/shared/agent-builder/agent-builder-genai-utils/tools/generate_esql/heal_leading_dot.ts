/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DOT_INDEX_ALLOW_LIST_PATTERNS } from '@kbn/agent-builder-common';

/**
 * Build a single regex that matches `FROM <name>` (and `FROM cluster:<name>`)
 * where `<name>` is one of the dot-prefixed allow-listed patterns, BUT with
 * the leading dot dropped — a known LLM hallucination from the ESQL
 * generation graph against system indices like `.alerts-security.alerts-default`.
 *
 * The heal is intentionally narrow:
 *   - Only triggers on `FROM` (the only ESQL source clause that takes a
 *     resource name; case-insensitive).
 *   - Only restores the dot for names whose dotted form is on the curated
 *     allow-list — we never invent leading dots on user-data indices.
 *   - Preserves an optional `cluster:` prefix.
 *
 * Patterns from `DOT_INDEX_ALLOW_LIST_PATTERNS` look like `.alerts-*` or
 * `.entities.*`. We strip the leading dot and convert `*` → `[^,\s|]*` so
 * the match stays bounded to a single index token.
 */
const buildHealRegex = (): RegExp => {
  const alternation = DOT_INDEX_ALLOW_LIST_PATTERNS.map((pattern) => {
    const withoutDot = pattern.startsWith('.') ? pattern.slice(1) : pattern;
    const escaped = withoutDot.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^,\\s|]*');
    return escaped;
  }).join('|');
  // Group 1: cluster prefix (optional, e.g. `remote:`); Group 2: the bare index name.
  return new RegExp(`\\bFROM\\s+([\\w-]+:)?(${alternation})\\b`, 'gi');
};

const HEAL_REGEX = buildHealRegex();

/**
 * Restore the leading dot on system-index names in an ESQL query when the
 * LLM dropped it. No-op when the leading dot is already present.
 *
 * Example:
 *   `FROM alerts-security.alerts-default | LIMIT 10`
 *   → `FROM .alerts-security.alerts-default | LIMIT 10`
 *
 *   `FROM .alerts-security.alerts-default | LIMIT 10` (already correct)
 *   → unchanged
 *
 *   `FROM logs-system.auth-default | LIMIT 10` (not on allow-list)
 *   → unchanged
 */
export const healLeadingDotInFromClause = (esql: string): string => {
  if (typeof esql !== 'string' || esql.length === 0) {
    return esql;
  }
  return esql.replace(HEAL_REGEX, (match, cluster, name) => {
    return `FROM ${cluster ?? ''}.${name}`;
  });
};
