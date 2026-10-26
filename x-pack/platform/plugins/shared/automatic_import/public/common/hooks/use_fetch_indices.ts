/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from './use_kibana';

export interface UseFetchIndicesResult {
  indices: string[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

const INDEX_MANAGEMENT_INDICES_PATH = '/api/index_management/indices';

interface IndexManagementListItem {
  name: string;
  hidden?: boolean;
  data_stream?: string | null;
}

export function buildSelectableIndexAndDataStreamNames(rows: IndexManagementListItem[]): string[] {
  const names = new Set<string>();
  for (const row of rows) {
    // Backing indices for data streams are often hidden; still surface the stream name.
    if (row.data_stream) {
      names.add(row.data_stream);
    } else if (row.hidden !== true) {
      names.add(row.name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export function useFetchIndices(): UseFetchIndicesResult {
  const { http } = useKibana().services;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['automaticImport', 'indexManagementIndices'],
    queryFn: async ({ signal }) => {
      const response = await http.get<IndexManagementListItem[]>(INDEX_MANAGEMENT_INDICES_PATH, {
        version: '1',
        signal,
      });
      return buildSelectableIndexAndDataStreamNames(response);
    },
    staleTime: 60_000,
  });

  return {
    indices: data ?? [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}
