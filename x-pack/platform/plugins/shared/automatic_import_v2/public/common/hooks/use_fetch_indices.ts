/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from './use_kibana';

export interface UseFetchIndicesResult {
  /** Index and data stream names (non-hidden, from current user scope). */
  indices: string[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

interface ResolveIndexResponse {
  indices: Array<{ name: string }>;
  aliases: Array<{ name: string }>;
  data_streams: Array<{ name: string }>;
}

export function useFetchIndices(search: string = '*'): UseFetchIndicesResult {
  const { http } = useKibana().services;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['fetchIndices', search],
    queryFn: async () => {
      const searchPattern = search.endsWith('*') ? search : `${search}*`;
      const response = await http.get<ResolveIndexResponse>(
        `/internal/automatic_import_v2/indices/resolve`,
        { query: { name: searchPattern } }
      );
      return [
        ...response.indices.map((index) => index.name),
        ...response.data_streams.map((ds) => ds.name),
      ];
    },
  });

  return {
    indices: data ?? [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}
