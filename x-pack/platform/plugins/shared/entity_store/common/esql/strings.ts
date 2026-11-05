/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { referenceField } from './cast';
import type { CastFieldOptions } from './cast';

/**
 * The value a field contributes to an entity id: its lowest non-empty value, or NULL when it has
 * none. A plain comparison on a multi-valued field yields NULL in ES|QL, so the field is reduced to
 * one value first. Mirrors `getFieldValue` (in-memory) and `__euid_min` (Painless).
 */
export function esqlIdentityValue(field: string, options?: CastFieldOptions): string {
  const ref = referenceField(field, options);
  return `CASE(MV_MIN(${ref}) == "", MV_FIRST(MV_SLICE(MV_SORT(MV_DEDUPE(${ref})), 1, 1)), MV_MIN(${ref}))`;
}

export function esqlIsNotNullOrEmpty(field: string, options?: CastFieldOptions) {
  const identityValue = `${esqlIdentityValue(field, options)} IS NOT NULL`;
  // A raw `IS NOT NULL` can be pushed down to Lucene, so it pre-filters before the reduced check.
  return options?.castFields === false
    ? `${field} IS NOT NULL AND ${identityValue}`
    : identityValue;
}

/**
 * Returns the precomputed column name for a field's boolean presence alias.
 * Used by the optimized entity-id pipeline to hoist the identity presence
 * checks out of per-row CASE arms into a single upstream EVAL stage.
 *
 * Example: `entity.namespace` → `entity_namespace_present`
 */
export function esqlPresentColumnName(field: string): string {
  return `${field.replace(/\./g, '_')}_present`;
}

/**
 * Returns the precomputed column name for a field's nullable-value alias.
 * Emits the field's `TO_STRING` value when present, or NULL otherwise.
 * Used by the COALESCE(CONCAT) entity-id optimisation to eliminate per-row
 * condition guards from CASE arms — CONCAT propagates NULL automatically.
 *
 * Example: `entity.namespace` → `entity_namespace_present_or_null`
 */
export function esqlPresentOrNullColumnName(field: string): string {
  return `${field.replace(/\./g, '_')}_present_or_null`;
}

export function esqlIsNullOrEmpty(field: string) {
  return `(${esqlIdentityValue(field)} IS NULL)`;
}

/**
 * Escape a string for use inside double-quoted ESQL string literals. The lexer
 * rejects a raw newline or carriage return there, so those and tabs are escaped
 * along with backslash and double-quote.
 */
export function escapeEsqlStringLiteral(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
