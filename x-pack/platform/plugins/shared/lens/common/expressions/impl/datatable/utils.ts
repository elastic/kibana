/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Datatable, type DatatableColumnMeta } from '@kbn/expressions-plugin/common';
import { getOriginalId } from '@kbn/transpose-utils';

/**
 * Make sure to specifically check for "top_hits" when looking for array values
 *
 * **Note**: use this utility function only at the expression level,
 * not before (i.e. to decide if a column in numeric in a configuration panel)
 */
function isLastValueWithoutArraySupport(meta: DatatableColumnMeta): boolean {
  return (
    meta.sourceParams?.type !== 'filtered_metric' ||
    (meta.sourceParams?.params as { customMetric: { type: 'top_hits' | 'top_metrics' } })
      ?.customMetric?.type !== 'top_hits'
  );
}

/**
 * Returns true for numerical fields
 *
 * Excludes the following types:
 *  - `range` - Stringified range
 *  - `multi_terms` - Multiple values
 *  - `filters` - Arbitrary label
 *  - Last value with array values
 *
 * **Note**: use this utility function only at the expression level,
 * not before (i.e. to decide if a column in numeric in a configuration panel)
 */
export function isNumericField(meta?: DatatableColumnMeta): boolean {
  return (
    meta?.type === 'number' &&
    meta.params?.id !== 'range' &&
    meta.params?.id !== 'multi_terms' &&
    meta.sourceParams?.type !== 'filters' &&
    isLastValueWithoutArraySupport(meta)
  );
}

/**
 * Returns true for numerical fields, excluding ranges
 *
 * **Note**: use this utility function only at the expression level,
 * not before (i.e. to decide if a column in numeric in a configuration panel)
 */
export function isNumericFieldForDatatable(table: Datatable | undefined, accessor: string) {
  const meta = getFieldMetaFromDatatable(table, accessor);
  return isNumericField(meta);
}

export function getFieldMetaFromDatatable(table: Datatable | undefined, accessor: string) {
  return table?.columns.find((col) => col.id === accessor || getOriginalId(col.id) === accessor)
    ?.meta;
}
