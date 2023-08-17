/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, SetStateAction, useState } from 'react';
import { EuiInMemoryTable, Direction, Pagination } from '@elastic/eui';

/**
 * Returned type for useTableState hook
 */
export interface UseTableState<T> {
  /**
   * Callback function which gets called whenever the pagination or sorting state of the table changed
   */
  onTableChange: EuiInMemoryTable<T>['onTableChange'];
  /**
   * Pagination object which contains pageIndex, pageSize
   */
  pagination: Pagination;
  /**
   * Sort field and sort direction
   */
  sorting: { sort: { field: string; direction: Direction } };
  /**
   * setPageIndex setter function which updates page index
   */
  setPageIndex: Dispatch<SetStateAction<number>>;
}

/**
 * Hook to help with managing the pagination and sorting for EuiInMemoryTable
 * @param {TableItem} items - data to show in the table
 * @param {string} initialSortField - field name to sort by default
 * @param {string} initialSortDirection - default to 'asc'
 */
export function useTableState<T>(
  items: T[],
  initialSortField: string,
  initialSortDirection: 'asc' | 'desc' = 'asc'
) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<string>(initialSortField);
  const [sortDirection, setSortDirection] = useState<Direction>(initialSortDirection);

  const onTableChange: EuiInMemoryTable<T>['onTableChange'] = ({
    page = { index: 0, size: 10 },
    sort = { field: sortField, direction: sortDirection },
  }) => {
    const { index, size } = page;
    setPageIndex(index);
    setPageSize(size);

    const { field, direction } = sort;
    setSortField(field as string);
    setSortDirection(direction as Direction);
  };

  const pagination: Pagination = {
    pageIndex,
    pageSize,
    totalItemCount: (items ?? []).length,
    pageSizeOptions: [10, 20, 50],
    showPerPageOptions: true,
  };

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  return {
    onTableChange,
    pagination,
    sorting,
    setPageIndex,
  };
}
