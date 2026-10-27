/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValueFormatter } from '../../model/formatter';

import {
  formatFromLensColumn,
  formatFromRawLensFormat,
  type LensColumnFormat,
} from './format_resolver';
import { translateKqlToEsql } from './kql_to_esql';
import type { FormBasedColumn, LensState, TextBasedColumn } from './types';

/**
 * A Lens accessor (a `columnId`) resolved against whichever datasource layer
 * owns it. The key field is {@link ResolvedColumn.dataName}: the name the
 * column carries in the ES|QL result — and therefore in the bound
 * `DataTable`.
 *
 * - formBased: synthesis aliases each aggregation to its `columnId`, so the
 *   data name *is* the accessor.
 * - textBased: the author's ES|QL emits the column under its `fieldName`
 *   (often a `RENAME ... as <fieldName>`), which differs from the opaque
 *   `columnId` the visualization references.
 */
export interface ResolvedColumn {
  dataName: string;
  label?: string;
  format?: ValueFormatter;
  /** Present only for formBased layers (carries dataType/sourceField/etc.). */
  formBased?: FormBasedColumn;
}

const formBasedLayerById = (state: LensState, layerId: string) =>
  state.datasourceStates?.formBased?.layers?.[layerId] ??
  state.datasourceStates?.indexpattern?.layers?.[layerId];

const textBasedColumnById = (
  state: LensState,
  layerId: string,
  accessor: string
): TextBasedColumn | undefined =>
  state.datasourceStates?.textBased?.layers?.[layerId]?.columns?.find(
    (column) => column.columnId === accessor
  );

export const resolveLensColumn = (
  state: LensState,
  layerId: string,
  accessor: string,
  fieldFormats?: Record<string, LensColumnFormat>
): ResolvedColumn | undefined => {
  const formBased = formBasedLayerById(state, layerId)?.columns[accessor];
  if (formBased) {
    const format = formatFromLensColumn(formBased, fieldFormats);
    return {
      dataName: accessor,
      ...(formBased.label ? { label: formBased.label } : {}),
      ...(format ? { format } : {}),
      formBased,
    };
  }
  const textBased = textBasedColumnById(state, layerId, accessor);
  if (textBased) {
    const label = textBased.label ?? textBased.fieldName;
    const format = formatFromRawLensFormat(textBased.params?.format);
    return {
      dataName: textBased.fieldName ?? accessor,
      ...(label ? { label } : {}),
      ...(format ? { format } : {}),
    };
  }
  return undefined;
};

// A `filters` bucket survives synthesis only when every filter's KQL lowers to
// ES|QL (see `buildFiltersBucket` in esql_synthesis). Mirror that check here so
// charts keep a split reference only when synthesis will emit the column. The
// escaper is irrelevant to parse success, so identity is fine.
const filtersBucketTranslatable = (column: FormBasedColumn): boolean => {
  const filters = (
    column.params as { filters?: Array<{ input?: { query?: unknown } }> } | undefined
  )?.filters;
  if (!Array.isArray(filters) || filters.length === 0) {
    return false;
  }
  return filters.every((filter) => {
    const query = typeof filter.input?.query === 'string' ? filter.input.query : '';
    return translateKqlToEsql(query, (field) => field) !== undefined;
  });
};

/**
 * Whether a form-based bucket column will survive ES|QL synthesis as a
 * `BY` term. A `filters` bucket survives only when all its KQL predicates can
 * be lowered; op types with no field and no translation are dropped, so a chart
 * must not keep a split/x reference to them.
 */
export const isEmittableBucket = (column: FormBasedColumn): boolean =>
  column.operationType === 'date_histogram' ||
  column.operationType === 'terms' ||
  (column.operationType === 'filters' && filtersBucketTranslatable(column)) ||
  (typeof column.sourceField === 'string' &&
    column.sourceField.length > 0 &&
    column.sourceField !== '___records___');
