/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import { findColumnIndex } from './integrity_utils';

const STK1_COLUMN_ALIASES = ['stk1', 'source', 'from', 'origin'] as const;
const STK2_COLUMN_ALIASES = ['stk2', 'dest', 'destination', 'to', 'target'] as const;
const FLOW_SIZE_COLUMN_ALIASES = ['size', 'value', 'count', 'doc_count'] as const;

/**
 * Soft guidance for ES|QL authoring (readable two-stack Sankey). Not enforced by
 * integrity — validation runs against a fixed sample time window that may be
 * sparse even when a wider live range has enough flows.
 */
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
  | { ok: false; reason: 'non_numeric_size' }
  | { ok: false; reason: 'blank_endpoints' };

/**
 * Structural post-query check for a two-stack Sankey-ready table:
 * - stk1 + stk2 + size columns,
 * - numeric size and non-blank endpoints on every row when rows exist.
 *
 * Empty / low-cardinality tables pass: integrity runs against a fixed sample
 * time window (`now-24h`), not the live dashboard range, so sparse results do
 * not prove the query shape is wrong.
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

  if (!values?.length) {
    return { ok: true };
  }

  const stk1Index = findColumnIndex(columns, STK1_COLUMN_ALIASES);
  const stk2Index = findColumnIndex(columns, STK2_COLUMN_ALIASES);
  const sizeIndex = findColumnIndex(columns, FLOW_SIZE_COLUMN_ALIASES);

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
The request asked for a Sankey / flow chart, but the resolved ES|QL result is not a usable flow table (needs stk1 + stk2 + numeric size). Author a Vega-Lite approximation of the request instead, and do NOT claim the result is a Sankey.`;
