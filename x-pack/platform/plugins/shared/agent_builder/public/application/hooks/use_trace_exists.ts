/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery } from '@kbn/react-query';
import { lastValueFrom } from 'rxjs';
import { buildAgentBuilderTracesIndexPattern } from '../../../common/traces';
import { useKibana } from './use_kibana';
import { useSpaceId } from './use_space_id';

const STALE_TIME_MS = 30_000;

interface TraceExistsResponse {
  rawResponse?: {
    hits?: {
      total?: { value: number } | number;
    };
  };
}

export const useTraceExists = (
  traceId: string | null,
  { enabled = true }: { enabled?: boolean } = {}
): { exists: boolean; isLoading: boolean } => {
  const { services } = useKibana();
  const search = services.plugins.data.search.search;
  const spaceId = useSpaceId(services.plugins.spaces);
  console.log('[useTraceExists] spaceId:', spaceId);
  const indexPattern = spaceId && buildAgentBuilderTracesIndexPattern(spaceId);

  const fetchTraceExists = useCallback(async (): Promise<boolean> => {
    console.log('[useTraceExists] fetching', { traceId, index: indexPattern });
    const response = (await lastValueFrom(
      search({
        params: {
          index: indexPattern,
          body: {
            query: { term: { trace_id: traceId } },
            size: 0,
            track_total_hits: 1,
          },
        },
      })
    )) as TraceExistsResponse;

    console.log(
      '[useTraceExists] raw response',
      JSON.stringify(response.rawResponse?.hits, null, 2)
    );
    const total = response.rawResponse?.hits?.total;
    const count = typeof total === 'number' ? total : total?.value ?? 0;
    console.log('[useTraceExists] total:', total, 'count:', count, 'exists:', count > 0);
    return count > 0;
  }, [search, traceId, indexPattern]);

  const query = useQuery<boolean, Error>({
    queryKey: ['llm-trace-waterfall', 'trace-exists', traceId],
    enabled: traceId != null && enabled && spaceId != null,
    retry: 3,
    retryDelay: 5_000,
    staleTime: STALE_TIME_MS,
    queryFn: fetchTraceExists,
  });

  console.log('[useTraceExists] hook state', {
    traceId,
    enabled,
    queryEnabled: indexPattern && traceId != null && enabled,
    data: query.data,
    isLoading: query.isLoading,
    error: query.error?.message,
    exists: query.data ?? false,
  });

  return {
    exists: query.data ?? false,
    isLoading: traceId != null ? query.isLoading : false,
  };
};
