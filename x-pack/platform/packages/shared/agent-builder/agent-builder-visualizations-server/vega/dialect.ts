/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';

/** Grammar used when authoring / normalizing a Vega-family spec. */
export type VegaDialect = 'vega-lite' | 'vega';

/** Allowlisted Raw Vega catalog intents (Dialect gate). */
export type VegaCatalogId = 'sunburst' | 'none';

/** Vega schema Kibana's Vega plugin targets. */
export const VEGA_SCHEMA = 'https://vega.github.io/schema/vega/v5.json';

/** Name of the Canonical ES|QL source dataset injected into Raw Vega specs. */
export const CANONICAL_ESQL_SOURCE_NAME = 'source';

/** Whether a `$schema` URL identifies Raw Vega (not Vega-Lite). */
export const isRawVegaSchema = (schema: unknown): boolean =>
  typeof schema === 'string' &&
  schema.includes('schema/vega/') &&
  !schema.includes('schema/vega-lite/');

/** Infer Dialect from a `$schema` value; defaults to Vega-Lite. */
export const dialectFromSchema = (schema: unknown): VegaDialect =>
  isRawVegaSchema(schema) ? 'vega' : 'vega-lite';

/** Infer Dialect from a stored/serialized spec (edit Dialect pin). */
export const dialectFromSpec = (
  spec: string | Record<string, unknown> | null | undefined
): VegaDialect => {
  if (!spec) {
    return 'vega-lite';
  }
  try {
    const parsed = typeof spec === 'string' ? JSON.parse(spec) : spec;
    return dialectFromSchema((parsed as { $schema?: unknown } | null)?.$schema);
  } catch {
    return 'vega-lite';
  }
};

const ID_COLUMN_ALIASES = ['id', 'node_id', 'nodeid', 'key'] as const;
const PARENT_COLUMN_ALIASES = ['parent', 'parent_id', 'parentid'] as const;

const findColumnIndex = (columns: EsqlEsqlColumnInfo[], aliases: readonly string[]): number =>
  columns.findIndex((column) => aliases.includes(column.name.toLowerCase()));

/**
 * Whether result columns look like a Parent–child table for Sunburst
 * (`id` + `parent`, with common aliases accepted).
 */
export const hasParentChildColumns = (columns: EsqlEsqlColumnInfo[] | undefined): boolean => {
  if (!columns?.length) {
    return false;
  }
  return (
    findColumnIndex(columns, ID_COLUMN_ALIASES) >= 0 &&
    findColumnIndex(columns, PARENT_COLUMN_ALIASES) >= 0
  );
};

export type ParentChildIntegrityResult =
  | { ok: true }
  | { ok: false; reason: 'missing_columns' }
  | { ok: false; reason: 'missing_parents'; missingParents: string[] }
  | { ok: false; reason: 'multiple_roots'; rootCount: number }
  | { ok: false; reason: 'no_root' };

/**
 * Whether a cell is an absent parent (root) rather than a parent id to resolve.
 * Treats ES|QL `TO_STRING(null)` → `"null"` as absent as well.
 */
const isAbsentParent = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  value === '' ||
  (typeof value === 'string' && value.toLowerCase() === 'null');

/**
 * Cheap post-query check for a Vega-stratify-ready hierarchy:
 * - exactly one root row (`parent` null/empty),
 * - every non-null `parent` value also appears as some row's `id`.
 *
 * Empty result sets pass vacuously (nothing to violate).
 */
export const validateParentChildRows = ({
  columns,
  values,
}: {
  columns: EsqlEsqlColumnInfo[] | undefined;
  values: unknown[][] | undefined;
}): ParentChildIntegrityResult => {
  if (!columns?.length || !hasParentChildColumns(columns)) {
    return { ok: false, reason: 'missing_columns' };
  }

  const idIndex = findColumnIndex(columns, ID_COLUMN_ALIASES);
  const parentIndex = findColumnIndex(columns, PARENT_COLUMN_ALIASES);
  if (!values?.length) {
    return { ok: true };
  }

  const ids = new Set<string>();
  let rootCount = 0;
  for (const row of values) {
    const id = row?.[idIndex];
    if (!isAbsentParent(id)) {
      ids.add(String(id));
    }
    if (isAbsentParent(row?.[parentIndex])) {
      rootCount += 1;
    }
  }

  if (rootCount === 0) {
    return { ok: false, reason: 'no_root' };
  }
  if (rootCount > 1) {
    return { ok: false, reason: 'multiple_roots', rootCount };
  }

  const missing = new Set<string>();
  for (const row of values) {
    const parent = row?.[parentIndex];
    if (isAbsentParent(parent)) {
      continue;
    }
    const parentId = String(parent);
    if (!ids.has(parentId)) {
      missing.add(parentId);
    }
  }

  if (missing.size === 0) {
    return { ok: true };
  }
  return { ok: false, reason: 'missing_parents', missingParents: [...missing].slice(0, 10) };
};

/** Format a Parent–child integrity failure for ES|QL regeneration feedback. */
export const formatParentChildIntegrityError = (result: ParentChildIntegrityResult): string => {
  if (result.ok) {
    return '';
  }
  switch (result.reason) {
    case 'missing_columns':
      return 'ES|QL result is missing id/parent columns required for a sunburst Parent–child table.';
    case 'no_root':
      return (
        'Parent–child integrity failed: no root row (a row with parent = null). ' +
        'Vega stratify needs exactly one root. Add a single synthetic root ' +
        '(id = "root", parent = null) and point top-level nodes at parent = "root".'
      );
    case 'multiple_roots':
      return (
        `Parent–child integrity failed: found ${result.rootCount} root rows (parent = null). ` +
        `Vega stratify errors with "multiple roots" and partition then fails. ` +
        `Emit exactly ONE root (id = "root", parent = null) and set every top-level category's parent to "root".`
      );
    case 'missing_parents': {
      const sample =
        result.missingParents.length > 0 ? result.missingParents.join(', ') : '(unknown)';
      return (
        `Parent–child integrity failed: leaf rows reference missing parent ids (${sample}). ` +
        `Vega stratify would error with "missing: <id>". Emit parent rows AND leaf rows, ` +
        `plus exactly one synthetic root.`
      );
    }
    default:
      return 'Parent–child integrity failed for sunburst.';
  }
};

/** @deprecated Use formatParentChildIntegrityError */
export const formatMissingParentsError = (missingParents: string[]): string =>
  formatParentChildIntegrityError({
    ok: false,
    reason: 'missing_parents',
    missingParents,
  });

/** Message attached when Sunburst falls back to a Vega-Lite approximation. */
export const SUNBURST_DISCLOSED_FALLBACK_CONTEXT = `DISCLOSED FALLBACK:
The request asked for a sunburst / hierarchy chart, but the resolved ES|QL result is not a usable parent-child table (needs identity + parent columns, exactly one root, and every parent id present as a row). Author a Vega-Lite approximation of the request instead, and do NOT claim the result is a sunburst.`;
