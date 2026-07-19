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

/**
 * Soft guidance for ES|QL authoring (readable radar spokes). Not enforced by
 * integrity — validation runs against a fixed sample time window that may be
 * sparse even when a wider live range has enough keys.
 */
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
  | { ok: false; reason: 'non_numeric_values' };

/**
 * Structural post-query check for a radar-ready table:
 * - `key` + `value` columns present,
 * - every non-null value is numeric when rows exist.
 *
 * Empty / low-cardinality tables pass: integrity runs against a fixed sample
 * time window (`now-24h`), not the live dashboard range, so sparse results do
 * not prove the query shape is wrong.
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

  if (!values?.length) {
    return { ok: true };
  }

  const valueIndex = findColumnIndex(columns, VALUE_COLUMN_ALIASES);
  for (const row of values) {
    const value = row?.[valueIndex];
    if (value === null || value === undefined || value === '') {
      continue;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return { ok: false, reason: 'non_numeric_values' };
    }
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
The request asked for a radar / spider chart, but the resolved ES|QL result is not a usable radar table (needs key + numeric value columns). Author a Vega-Lite approximation of the request instead, and do NOT claim the result is a radar chart.`;
