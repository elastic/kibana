/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiTableActionsColumnType,
  EuiTableComputedColumnType,
  EuiTableFieldDataColumnType,
  Pagination,
  PropertySort,
} from '@elastic/eui';
import { Comparators } from '@elastic/eui';

import type { TransformListRow } from '../../../../common';

type TransformListColumn =
  | EuiTableComputedColumnType<TransformListRow>
  | EuiTableFieldDataColumnType<TransformListRow>
  | EuiTableActionsColumnType<TransformListRow>;

interface GetCurrentPageTransformsArgs {
  columns: TransformListColumn[];
  pagination: Pagination;
  sorting: { sort: PropertySort };
  transforms: TransformListRow[];
}

// EuiInMemoryTable does not expose its computed page, so we mirror its sorting and pagination to identify visible transforms while preserving selection across pages.
export const getCurrentPageTransforms = ({
  columns,
  pagination,
  sorting,
  transforms,
}: GetCurrentPageTransformsArgs): TransformListRow[] => {
  const sortColumn = columns.find(
    (column) =>
      column.name === sorting.sort.field ||
      ('field' in column && column.field === sorting.sort.field)
  );
  const sortable = sortColumn && 'sortable' in sortColumn ? sortColumn.sortable : undefined;
  const sortField = sortColumn && 'field' in sortColumn ? sortColumn.field : sorting.sort.field;
  const sortedTransforms = [...transforms].sort(
    typeof sortable === 'function'
      ? Comparators.value(sortable, Comparators.default(sorting.sort.direction))
      : Comparators.property(sortField, Comparators.default(sorting.sort.direction))
  );
  const pageIndex = pagination.pageIndex ?? 0;
  const pageSize = pagination.pageSize ?? sortedTransforms.length;

  return sortedTransforms.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
};
