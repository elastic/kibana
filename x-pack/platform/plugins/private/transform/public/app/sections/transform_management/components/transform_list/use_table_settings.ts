/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { Direction, EuiBasicTableProps, Pagination, PropertySort } from '@elastic/eui';
import type { ListingPageUrlState } from '@kbn/ml-url-state';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// Copying from EUI EuiBasicTable types as type is not correctly picked up for table's onChange
// Can be removed when https://github.com/elastic/eui/issues/4011 is addressed in EUI
export interface Criteria<T extends object> {
  page?: {
    index: number;
    size: number;
  };
  sort?: {
    field: keyof T;
    direction: Direction;
  };
}
export interface CriteriaWithPagination<T extends object> extends Criteria<T> {
  page: {
    index: number;
    size: number;
  };
}

interface UseTableSettingsReturnValue<T extends object> {
  onTableChange: EuiBasicTableProps<T>['onChange'];
  pagination: Pagination;
  sorting: { sort: PropertySort };
}

export function useTableSettings<TypeOfItem extends object>(
  sortByField: keyof TypeOfItem,
  items: TypeOfItem[],
  pageState: ListingPageUrlState,
  updatePageState: (update: Partial<ListingPageUrlState>) => void
): UseTableSettingsReturnValue<TypeOfItem> {
  const { pageIndex, pageSize, sortField, sortDirection } = pageState;

  const onTableChange: EuiBasicTableProps<TypeOfItem>['onChange'] = useCallback(
    ({ page, sort }: CriteriaWithPagination<TypeOfItem>) => {
      let resultSortField = sort?.field;
      if (typeof resultSortField !== 'string') {
        resultSortField = pageState.sortField as keyof TypeOfItem;
      }

      const result = {
        pageIndex: page?.index ?? pageState.pageIndex,
        pageSize: page?.size ?? pageState.pageSize,
        sortField: resultSortField as string,
        sortDirection: sort?.direction ?? pageState.sortDirection,
      };
      updatePageState(result);
    },
    [pageState, updatePageState]
  );

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: items.length,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  };

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection as Direction,
    },
  };
  return { onTableChange, pagination, sorting };
}
