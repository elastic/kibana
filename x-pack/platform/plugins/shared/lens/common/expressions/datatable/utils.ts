/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Datatable, type DatatableColumnMeta } from '@kbn/expressions-plugin/common';
import { getOriginalId } from '@kbn/transpose-utils';

/**
 * Returns true for numerical fields
 *
 * Excludes the following types:
 *  - `range` - Stringified range
 *  - `multi_terms` - Multiple values
 *  - `filters` - Arbitrary label
 *  - `filtered_metric` - Array of values
 */
export function isNumericField(meta?: DatatableColumnMeta): boolean {
  return (
    meta?.type === 'number' &&
    meta.params?.id !== 'range' &&
    meta.params?.id !== 'multi_terms' &&
    meta.sourceParams?.type !== 'filters' &&
    meta.sourceParams?.type !== 'filtered_metric'
  );
}

/**
 * Returns true for numerical fields, excluding ranges
 */
export function isNumericFieldForDatatable(table: Datatable | undefined, accessor: string) {
  const meta = getFieldMetaFromDatatable(table, accessor);
  return isNumericField(meta);
}

export function getFieldMetaFromDatatable(table: Datatable | undefined, accessor: string) {
  return table?.columns.find((col) => col.id === accessor || getOriginalId(col.id) === accessor)
    ?.meta;
}
