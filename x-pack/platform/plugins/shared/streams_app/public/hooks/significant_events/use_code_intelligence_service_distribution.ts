/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import { useKibana } from '../use_kibana';
import { useFetchErrorToast } from '../use_fetch_error_toast';

export const CODE_INTELLIGENCE_SERVICE_DISTRIBUTION_QUERY_KEY = [
  'code-intelligence-service-distribution',
];

/**
 * Fetches how many services are known from code only, logs only, or both —
 * used by the Code Intelligence tab's coverage visualization.
 */
export function useCodeIntelligenceServiceDistribution({
  enabled = true,
}: { enabled?: boolean } = {}) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const showFetchErrorToast = useFetchErrorToast();

  const { data, isLoading } = useQuery({
    queryKey: CODE_INTELLIGENCE_SERVICE_DISTRIBUTION_QUERY_KEY,
    queryFn: ({ signal }: QueryFunctionContext) =>
      streamsRepositoryClient.fetch(
        'GET /internal/streams/code_intelligence/_service_distribution',
        { signal: signal ?? null }
      ),
    onError: showFetchErrorToast,
    enabled,
  });

  return {
    codeOnly: data?.codeOnly ?? 0,
    both: data?.both ?? 0,
    logsOnly: data?.logsOnly ?? 0,
    codeOnlyServices: data?.codeOnlyServices ?? [],
    isLoading,
  };
}
