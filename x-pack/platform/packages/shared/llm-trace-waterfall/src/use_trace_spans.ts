/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { TraceSpan } from './types';

interface TraceSpansResult {
  spans: TraceSpan[];
  durationMs: number;
}

export type TraceFetcher = (traceId: string) => Promise<TraceSpansResult>;

const EMPTY_RESULT: TraceSpansResult = {
  spans: [],
  durationMs: 0,
};

export const useTraceSpans = (
  traceId: string | null,
  { fetchTrace }: { fetchTrace: TraceFetcher }
): { spans: TraceSpan[]; durationMs: number; isLoading: boolean; error: Error | null } => {
  const query = useQuery<TraceSpansResult, Error>({
    // Note: fetcher identity is not part of the key; same traceId across fetchers shares cache.
    queryKey: ['llm-trace-waterfall', 'trace-spans', traceId],
    enabled: traceId != null,
    queryFn: () => fetchTrace(traceId!),
  });

  return {
    spans: query.data?.spans ?? EMPTY_RESULT.spans,
    durationMs: query.data?.durationMs ?? EMPTY_RESULT.durationMs,
    isLoading: traceId != null ? query.isLoading : false,
    error: query.error ?? null,
  };
};
