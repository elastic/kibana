/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import { useKibana } from './use_kibana';
import { useFetchErrorToast } from './use_fetch_error_toast';

export const UNBACKED_QUERIES_COUNT_QUERY_KEY = ['unbackedQueriesCount'] as const;

export function useUnbackedQueriesCount() {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const showFetchErrorToast = useFetchErrorToast();

  const query = useQuery({
    queryKey: UNBACKED_QUERIES_COUNT_QUERY_KEY,
    queryFn: async ({ signal }: QueryFunctionContext) => {
      return streamsRepositoryClient.fetch('GET /internal/streams/queries/_unbacked_count', {
        signal: signal ?? null,
      });
    },
    onError: showFetchErrorToast,
  });

  return {
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
    refetch: query.refetch,
    query,
  };
}
