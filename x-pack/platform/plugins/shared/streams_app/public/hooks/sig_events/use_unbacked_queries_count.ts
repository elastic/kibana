/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import { useFetchErrorToast } from '../use_fetch_error_toast';
import { useQueriesApi } from './use_queries_api';
import { HIGH_SEVERITY_THRESHOLD } from '../../components/sig_events/significant_events_discovery/components/severity_badge/severity_badge';

export const UNBACKED_QUERIES_COUNT_QUERY_KEY = ['unbackedQueriesCount'] as const;

export function useUnbackedQueriesCount() {
  const showFetchErrorToast = useFetchErrorToast();
  const { getUnbackedQueriesCount } = useQueriesApi();

  const query = useQuery({
    queryKey: UNBACKED_QUERIES_COUNT_QUERY_KEY,
    queryFn: async ({ signal }: QueryFunctionContext) => {
      return getUnbackedQueriesCount(signal ?? null, HIGH_SEVERITY_THRESHOLD);
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
