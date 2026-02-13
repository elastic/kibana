/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import type { ISearchGeneric } from '@kbn/search-types';
import { useQuery } from '@kbn/react-query';
import { getESQLQueryColumnsRaw } from '@kbn/esql-utils';

export interface QueryColumn {
  name: string;
  type: string;
}

interface UseQueryColumnsProps {
  query: string;
  search: ISearchGeneric;
  onSuccess?: (columns: QueryColumn[]) => void;
}

export const useQueryColumns = ({ query, search, onSuccess }: UseQueryColumnsProps) => {
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const columnsQuery = useQuery({
    queryKey: ['queryColumns', query],
    queryFn: async ({ signal }) => {
      const rawColumns = await getESQLQueryColumnsRaw({
        esqlQuery: query,
        search,
        signal,
        dropNullColumns: true,
      });

      return rawColumns.map(({ name, type }) => ({ name, type }));
    },
    enabled: Boolean(query),
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Call onSuccess when columns are fetched for the current query
  // Include dataUpdatedAt to detect when new data arrives (even if data reference is same)
  useEffect(() => {
    if (columnsQuery.data && columnsQuery.data.length > 0 && onSuccessRef.current) {
      onSuccessRef.current(columnsQuery.data);
    }
  }, [columnsQuery.data, columnsQuery.dataUpdatedAt]);

  return {
    ...columnsQuery,
    data: columnsQuery.data ?? [],
  };
};
