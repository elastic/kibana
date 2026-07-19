/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import { findColumnIndex } from './integrity_utils';

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
  | { ok: false; reason: 'empty_result' }
  | { ok: false; reason: 'too_few_keys'; keyCount: number }
  | { ok: false; reason: 'non_numeric_values' };

/**
 * Cheap post-query check for a radar-ready table:
 * - `key` + `value` columns present,
 * - at least one result row (empty tables blank the chart / VL extents),
 * - at least {@link RADAR_MIN_KEYS} distinct keys,
 * - every non-null value is numeric.
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
    return { ok: false, reason: 'empty_result' };
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
    case 'empty_result':
      return (
        'Radar integrity failed: ES|QL returned 0 rows. Remove filters that empty the table ' +
        '(common bug: COUNT_DISTINCT(key) while also grouping BY key is always 1). ' +
        'Use STATS value BY series, key then SORT/LIMIT — or INLINE STATS n_keys = COUNT_DISTINCT(key) BY series before filtering series.'
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
