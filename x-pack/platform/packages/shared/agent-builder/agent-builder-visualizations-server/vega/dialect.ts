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
export type VegaCatalogId = 'sunburst' | 'radar' | 'sankey' | 'none';

/** Catalog ids that select the Raw Vega authoring Dialect. */
export const RAW_VEGA_CATALOG_IDS = ['sunburst', 'radar', 'sankey'] as const;

export const isRawVegaCatalogId = (
  catalogId: VegaCatalogId
): catalogId is Exclude<VegaCatalogId, 'none'> =>
  (RAW_VEGA_CATALOG_IDS as readonly string[]).includes(catalogId);

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

const KEY_COLUMN_ALIASES = ['key', 'category', 'axis', 'dimension', 'spoke'] as const;
const VALUE_COLUMN_ALIASES = ['value', 'metric', 'score', 'measure'] as const;

/** Minimum distinct axis keys for a readable radar. */
export const RADAR_MIN_KEYS = 3;

/**
 * Whether result columns look like a radar table (`key` + `value`, with common
 * aliases). Optional `series` is not required for the column check.
 */
export const hasRadarColumns = (columns: EsqlEsqlColumnInfo[] | undefined): boolean => {
  if (!columns?.length) {
    return false;
  }
  return (
    findColumnIndex(columns, KEY_COLUMN_ALIASES) >= 0 &&
    findColumnIndex(columns, VALUE_COLUMN_ALIASES) >= 0
  );
};

export type RadarIntegrityResult =
  | { ok: true }
  | { ok: false; reason: 'missing_columns' }
  | { ok: false; reason: 'too_few_keys'; keyCount: number }
  | { ok: false; reason: 'non_numeric_values' };

/**
 * Cheap post-query check for a radar-ready table:
 * - `key` + `value` columns present,
 * - at least {@link RADAR_MIN_KEYS} distinct keys when rows exist,
 * - every non-null value is numeric.
 *
 * Empty result sets pass vacuously (nothing to violate).
 */
export const validateRadarRows = ({
  columns,
  values,
}: {
  columns: EsqlEsqlColumnInfo[] | undefined;
  values: unknown[][] | undefined;
}): RadarIntegrityResult => {
  if (!columns?.length || !hasRadarColumns(columns)) {
    return { ok: false, reason: 'missing_columns' };
  }

  const keyIndex = findColumnIndex(columns, KEY_COLUMN_ALIASES);
  const valueIndex = findColumnIndex(columns, VALUE_COLUMN_ALIASES);
  if (!values?.length) {
    return { ok: true };
  }

  const keys = new Set<string>();
  let sawNonNumeric = false;
  for (const row of values) {
    const key = row?.[keyIndex];
    if (key !== null && key !== undefined && key !== '') {
      keys.add(String(key));
    }
    const value = row?.[valueIndex];
    if (value === null || value === undefined || value === '') {
      continue;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      sawNonNumeric = true;
    }
  }

  if (keys.size < RADAR_MIN_KEYS) {
    return { ok: false, reason: 'too_few_keys', keyCount: keys.size };
  }
  if (sawNonNumeric) {
    return { ok: false, reason: 'non_numeric_values' };
  }
  return { ok: true };
};

/** Format a radar integrity failure for ES|QL regeneration feedback. */
export const formatRadarIntegrityError = (result: RadarIntegrityResult): string => {
  if (result.ok) {
    return '';
  }
  switch (result.reason) {
    case 'missing_columns':
      return (
        'ES|QL result is missing key/value columns required for a radar chart. ' +
        'Emit columns named key and value (optional series for multi-series radars).'
      );
    case 'too_few_keys':
      return (
        `Radar integrity failed: found only ${result.keyCount} distinct key(s); ` +
        `need at least ${RADAR_MIN_KEYS} axis categories (spokes). Aggregate more dimensions ` +
        `or use a categorical field with ≥${RADAR_MIN_KEYS} values.`
      );
    case 'non_numeric_values':
      return (
        'Radar integrity failed: value column contains non-numeric cells. ' +
        'Emit a numeric measure (COUNT, SUM, AVG, …) as value.'
      );
    default:
      return 'Radar integrity failed.';
  }
};

/** Message attached when Radar falls back to a Vega-Lite approximation. */
export const RADAR_DISCLOSED_FALLBACK_CONTEXT = `DISCLOSED FALLBACK:
The request asked for a radar / spider chart, but the resolved ES|QL result is not a usable radar table (needs key + numeric value columns and at least ${RADAR_MIN_KEYS} distinct axis keys). Author a Vega-Lite approximation of the request instead, and do NOT claim the result is a radar chart.`;

const STK1_COLUMN_ALIASES = ['stk1', 'source', 'from', 'origin'] as const;
const STK2_COLUMN_ALIASES = ['stk2', 'dest', 'destination', 'to', 'target'] as const;
const FLOW_SIZE_COLUMN_ALIASES = ['size', 'value', 'count', 'doc_count'] as const;

/** Minimum flow rows for a readable two-stack Sankey. */
export const SANKEY_MIN_FLOWS = 2;

/**
 * Whether result columns look like a Sankey flow table (`stk1` + `stk2` + `size`,
 * with common aliases).
 */
export const hasSankeyColumns = (columns: EsqlEsqlColumnInfo[] | undefined): boolean => {
  if (!columns?.length) {
    return false;
  }
  return (
    findColumnIndex(columns, STK1_COLUMN_ALIASES) >= 0 &&
    findColumnIndex(columns, STK2_COLUMN_ALIASES) >= 0 &&
    findColumnIndex(columns, FLOW_SIZE_COLUMN_ALIASES) >= 0
  );
};

export type SankeyIntegrityResult =
  | { ok: true }
  | { ok: false; reason: 'missing_columns' }
  | { ok: false; reason: 'too_few_flows'; flowCount: number }
  | { ok: false; reason: 'non_numeric_size' }
  | { ok: false; reason: 'blank_endpoints' };

/**
 * Cheap post-query check for a two-stack Sankey-ready table:
 * - stk1 + stk2 + size columns,
 * - at least {@link SANKEY_MIN_FLOWS} rows when data exists,
 * - numeric size and non-blank endpoints on every row.
 *
 * Empty result sets pass vacuously (nothing to violate).
 */
export const validateSankeyRows = ({
  columns,
  values,
}: {
  columns: EsqlEsqlColumnInfo[] | undefined;
  values: unknown[][] | undefined;
}): SankeyIntegrityResult => {
  if (!columns?.length || !hasSankeyColumns(columns)) {
    return { ok: false, reason: 'missing_columns' };
  }

  const stk1Index = findColumnIndex(columns, STK1_COLUMN_ALIASES);
  const stk2Index = findColumnIndex(columns, STK2_COLUMN_ALIASES);
  const sizeIndex = findColumnIndex(columns, FLOW_SIZE_COLUMN_ALIASES);
  if (!values?.length) {
    return { ok: true };
  }

  if (values.length < SANKEY_MIN_FLOWS) {
    return { ok: false, reason: 'too_few_flows', flowCount: values.length };
  }

  let sawNonNumeric = false;
  let sawBlankEndpoint = false;
  for (const row of values) {
    const stk1 = row?.[stk1Index];
    const stk2 = row?.[stk2Index];
    if (
      stk1 === null ||
      stk1 === undefined ||
      stk1 === '' ||
      stk2 === null ||
      stk2 === undefined ||
      stk2 === ''
    ) {
      sawBlankEndpoint = true;
    }
    const size = row?.[sizeIndex];
    if (size === null || size === undefined || size === '') {
      continue;
    }
    if (typeof size !== 'number' || !Number.isFinite(size)) {
      sawNonNumeric = true;
    }
  }

  if (sawBlankEndpoint) {
    return { ok: false, reason: 'blank_endpoints' };
  }
  if (sawNonNumeric) {
    return { ok: false, reason: 'non_numeric_size' };
  }
  return { ok: true };
};

/** Format a Sankey integrity failure for ES|QL regeneration feedback. */
export const formatSankeyIntegrityError = (result: SankeyIntegrityResult): string => {
  if (result.ok) {
    return '';
  }
  switch (result.reason) {
    case 'missing_columns':
      return (
        'ES|QL result is missing stk1/stk2/size columns required for a Sankey flow table. ' +
        'Emit columns named stk1, stk2, and size (source→destination flows).'
      );
    case 'too_few_flows':
      return (
        `Sankey integrity failed: found only ${result.flowCount} flow row(s); ` +
        `need at least ${SANKEY_MIN_FLOWS} source→destination pairs. Aggregate more combinations ` +
        `or raise LIMIT.`
      );
    case 'non_numeric_size':
      return (
        'Sankey integrity failed: size column contains non-numeric cells. ' +
        'Emit a numeric measure (COUNT, SUM, …) as size.'
      );
    case 'blank_endpoints':
      return (
        'Sankey integrity failed: some rows have blank stk1 or stk2. ' +
        'Filter null/empty endpoints before STATS (e.g. WHERE OriginCountry IS NOT NULL).'
      );
    default:
      return 'Sankey integrity failed.';
  }
};

/** Message attached when Sankey falls back to a Vega-Lite approximation. */
export const SANKEY_DISCLOSED_FALLBACK_CONTEXT = `DISCLOSED FALLBACK:
The request asked for a Sankey / flow chart, but the resolved ES|QL result is not a usable flow table (needs stk1 + stk2 + numeric size and at least ${SANKEY_MIN_FLOWS} flow rows). Author a Vega-Lite approximation of the request instead, and do NOT claim the result is a Sankey.`;

/** Disclosed-fallback authoring context for a catalog id (empty when none). */
export const disclosedFallbackContextForCatalog = (catalogId: VegaCatalogId): string => {
  switch (catalogId) {
    case 'sunburst':
      return SUNBURST_DISCLOSED_FALLBACK_CONTEXT;
    case 'radar':
      return RADAR_DISCLOSED_FALLBACK_CONTEXT;
    case 'sankey':
      return SANKEY_DISCLOSED_FALLBACK_CONTEXT;
    default:
      return '';
  }
};

/**
 * Best-effort catalog inference from an existing Raw Vega spec (edit path).
 * Prefers structural cues so "make it blue" edits keep the right chart family.
 */
export const inferRawVegaCatalogId = (
  spec: string | Record<string, unknown> | null | undefined
): Exclude<VegaCatalogId, 'none'> | 'none' => {
  if (!spec) {
    return 'none';
  }
  try {
    const parsed = typeof spec === 'string' ? JSON.parse(spec) : spec;
    const text = JSON.stringify(parsed).toLowerCase();
    if (text.includes('"stratify"') || text.includes('"partition"')) {
      return 'sunburst';
    }
    if (
      text.includes('"linkpath"') ||
      (text.includes('"stk1"') && text.includes('"stk2"') && text.includes('"fold"'))
    ) {
      return 'sankey';
    }
    if (
      text.includes('"linear-closed"') ||
      text.includes("scale('angular'") ||
      text.includes('scale("angular"') ||
      (text.includes('"angular"') && text.includes('"radial"'))
    ) {
      return 'radar';
    }
    return 'none';
  } catch {
    return 'none';
  }
};
