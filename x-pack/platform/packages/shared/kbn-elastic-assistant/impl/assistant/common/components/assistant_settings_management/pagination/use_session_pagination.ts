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

export const useSessionPagination = ({
  defaultTableOptions,
  nameSpace = DEFAULT_ASSISTANT_NAMESPACE,
  storageKey,
}: {
  defaultTableOptions: {
    page: { size: number; index: number };
    sort: { field: string; direction: Direction };
  };
  nameSpace?: string;
  storageKey: string;
}) => {
  const [sessionStorageTableOptions = defaultTableOptions, setSessionStorageTableOptions] =
    useSessionStorage(`${nameSpace}.${storageKey}`, defaultTableOptions);

  const pagination = useMemo(
    () => ({
      initialPageSize: sessionStorageTableOptions.page.size,
      pageSizeOptions: [5, 10, DEFAULT_PAGE_SIZE, 50],
      pageIndex: sessionStorageTableOptions.page.index,
    }),
    [sessionStorageTableOptions]
  );

  const sorting = useMemo(
    () => ({
      sort: sessionStorageTableOptions.sort,
    }),
    [sessionStorageTableOptions.sort]
  );

  const onTableChange = useCallback(
    ({
      page,
      sort,
    }: // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any) => {
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
