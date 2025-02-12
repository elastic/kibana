/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Direction } from '@elastic/eui';
import { useCallback, useMemo } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { DEFAULT_ASSISTANT_NAMESPACE } from '../../../../../assistant_context/constants';
import { DEFAULT_PAGE_SIZE } from '../../../../settings/const';

export const DEFAULT_TABLE_OPTIONS = {
  page: { size: DEFAULT_PAGE_SIZE, index: 0 },
  sort: { field: '', direction: 'asc' as const },
};

interface InMemoryPagination {
  initialPageSize: number;
  pageSizeOptions: number[];
  pageIndex: number;
}

interface ServerSidePagination {
  totalItemCount: number;
  pageSize: number;
  pageSizeOptions: number[];
  pageIndex: number;
}

interface UseSessionPaginationReturn<T extends boolean> {
  onTableChange: ({
    page,
    sort,
  }: {
    page: { size: number; index: number };
    sort: { field: string; direction: Direction };
  }) => void;
  pagination: T extends true ? InMemoryPagination : ServerSidePagination;
  sorting: {
    sort: { field: string; direction: Direction };
  };
}

export const useSessionPagination = <T extends boolean>({
  defaultTableOptions,
  nameSpace = DEFAULT_ASSISTANT_NAMESPACE,
  inMemory = true as T,
  storageKey,
  totalItemCount = 0,
}: {
  defaultTableOptions: {
    page: { size: number; index: number };
    sort: { field: string; direction: Direction };
  };
  inMemory?: boolean;
  nameSpace?: string;
  storageKey: string;
  totalItemCount?: number;
}): UseSessionPaginationReturn<T> => {
  const [sessionStorageTableOptions = defaultTableOptions, setSessionStorageTableOptions] =
    useSessionStorage(`${nameSpace}.${storageKey}`, defaultTableOptions);

  const pagination = useMemo(
    () =>
      inMemory
        ? ({
            initialPageSize: sessionStorageTableOptions.page.size,
            pageSizeOptions: [5, 10, DEFAULT_PAGE_SIZE, 50],
            pageIndex: sessionStorageTableOptions.page.index,
          } as InMemoryPagination)
        : ({
            totalItemCount,
            pageSize: sessionStorageTableOptions.page.size ?? DEFAULT_PAGE_SIZE,
            pageSizeOptions: [5, 10, DEFAULT_PAGE_SIZE, 50],
            pageIndex: sessionStorageTableOptions.page.index,
          } as ServerSidePagination),
    [inMemory, sessionStorageTableOptions, totalItemCount]
  );

  const sorting = useMemo(
    () => ({
      sort: sessionStorageTableOptions.sort,
    }),
    [sessionStorageTableOptions.sort]
  );

  const onTableChange = useCallback(
    (
      args: // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any
    ) => {
      const { page, sort } = args;
      console.log('onTableChange', args);
      setSessionStorageTableOptions({
        page,
        sort,
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
