/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CriteriaWithPagination, EuiInMemoryTableProps, EuiTableSortingType } from '@elastic/eui';
import { useCallback, useMemo } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { DEFAULT_ASSISTANT_NAMESPACE } from '../../../../../assistant_context/constants';
import { DEFAULT_PAGE_SIZE } from '../../../../settings/const';

export const getDefaultTableOptions = <T>({
  pageSize,
  sortDirection,
  sortField,
}: {
  sortField: keyof T;
  sortDirection?: 'asc' | 'desc';
  pageSize?: number;
}) => ({
  page: { size: pageSize ?? DEFAULT_PAGE_SIZE, index: 0 },
  sort: { field: sortField, direction: sortDirection ?? ('desc' as const) },
});

interface InMemoryPagination {
  initialPageSize: number;
  pageSizeOptions: number[];
  pageIndex: number;
}

export interface ServerSidePagination {
  totalItemCount: number;
  pageSize: number;
  pageSizeOptions: number[];
  pageIndex: number;
}

interface UseSessionPaginationReturn<T extends {}, B extends boolean> {
  onTableChange: (criteria: CriteriaWithPagination<T>) => void;
  pagination: B extends true ? InMemoryPagination : ServerSidePagination;
  sorting: B extends true ? EuiInMemoryTableProps<T>['sorting'] : EuiTableSortingType<T>;
}

export const useSessionPagination = <T extends {}, B extends boolean = true>({
  defaultTableOptions,
  nameSpace = DEFAULT_ASSISTANT_NAMESPACE,
  inMemory,
  storageKey,
  totalItemCount = 0,
}: {
  defaultTableOptions: CriteriaWithPagination<T>;
  inMemory?: B;
  nameSpace?: string;
  storageKey: string;
  totalItemCount?: number;
}): UseSessionPaginationReturn<T, B> => {
  const [sessionStorageTableOptions = defaultTableOptions, setSessionStorageTableOptions] =
    useSessionStorage<CriteriaWithPagination<T>>(`${nameSpace}.${storageKey}`, defaultTableOptions);

  const pagination = useMemo(
    () =>
      (inMemory
        ? {
            initialPageSize: sessionStorageTableOptions.page.size,
            pageSizeOptions: [5, 10, DEFAULT_PAGE_SIZE, 50],
            pageIndex: sessionStorageTableOptions.page.index,
          }
        : {
            totalItemCount,
            pageSize: sessionStorageTableOptions.page.size ?? DEFAULT_PAGE_SIZE,
            pageSizeOptions: [5, 10, DEFAULT_PAGE_SIZE, 50],
            pageIndex: sessionStorageTableOptions.page.index,
          }) as UseSessionPaginationReturn<T, B>['pagination'],
    [inMemory, sessionStorageTableOptions, totalItemCount]
  );

  const sorting = useMemo(() => {
    return {
      sort: sessionStorageTableOptions.sort ?? defaultTableOptions.sort,
    } as UseSessionPaginationReturn<T, B>['sorting'];
  }, [defaultTableOptions.sort, sessionStorageTableOptions.sort]);

  const onTableChange: UseSessionPaginationReturn<T, B>['onTableChange'] = useCallback(
    (args: CriteriaWithPagination<T>) => {
      const { page, sort } = args;
      setSessionStorageTableOptions({
        page,
        ...(sort ? { sort } : {}),
      });
    },
    [setSessionStorageTableOptions]
  );

  return {
    onTableChange,
    pagination,
    sorting,
  };
};
