/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Direction, EuiBasicTableProps, Pagination } from '@elastic/eui';
import { useCallback, useMemo } from 'react';
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

interface UseTableSettingsReturnValue<T extends object, HidePagination extends boolean = false> {
  onTableChange: EuiBasicTableProps<T>['onChange'];
  pagination: HidePagination extends true
    ? Required<Omit<Pagination, 'showPerPageOptions'>> | boolean
    : Required<Omit<Pagination, 'showPerPageOptions'>>;
  sorting: {
    sort: {
      field: keyof T;
      direction: 'asc' | 'desc';
    };
  };
}

export function useTableSettings<TypeOfItem extends object>(
  totalItemCount: number,
  pageState: ListingPageUrlState,
  updatePageState: (update: Partial<ListingPageUrlState>) => void,
  hide: true
): UseTableSettingsReturnValue<TypeOfItem, true>;

export function useTableSettings<TypeOfItem extends object>(
  totalItemCount: number,
  pageState: ListingPageUrlState,
  updatePageState: (update: Partial<ListingPageUrlState>) => void,
  hide?: false
): UseTableSettingsReturnValue<TypeOfItem, false>;

/**
 *
 * @param totalItemCount
 * @param pageState
 * @param updatePageState
 * @param hide If true, hides pagination when total number of items is lower that the smallest per page option
 * @returns
 */
export function useTableSettings<TypeOfItem extends object>(
  totalItemCount: number,
  pageState: ListingPageUrlState,
  updatePageState: (update: Partial<ListingPageUrlState>) => void,
  hide: boolean = false
): UseTableSettingsReturnValue<TypeOfItem, boolean> {
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

  const pagination = useMemo(() => {
    if (hide && totalItemCount <= Math.min(...PAGE_SIZE_OPTIONS)) {
      // Hide pagination if total number of items is lower that the smallest per page option
      return false;
    }

    return {
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
    };
  }, [totalItemCount, pageIndex, pageSize, hide]);

  const sorting = useMemo(
    () => ({
      sort: {
        field: sortField as keyof TypeOfItem,
        direction: sortDirection as Direction,
      },
    }),
    [sortField, sortDirection]
  );

  return { onTableChange, pagination, sorting };
}
