/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useQuery } from '@kbn/react-query';
import { lastValueFrom } from 'rxjs';
import { mapEsSourceToTraceSpan } from './map_es_source_to_trace_span';
import type { TraceSpan } from './types';

interface TraceSearchRequest {
  params: {
    index: 'traces-*';
    body: {
      query: {
        term: {
          trace_id: string;
        };
      };
      sort: Array<{
        '@timestamp': {
          order: 'asc';
        };
      }>;
      size: number;
    };
  };
}

interface TraceSearchHit {
  _id?: string;
  _source?: Parameters<typeof mapEsSourceToTraceSpan>[0];
}

interface TraceSearchResponse {
  rawResponse: {
    hits?: {
      hits?: TraceSearchHit[];
    };
  };
}

interface UseTraceSpansResult {
  spans: TraceSpan[];
  durationMs: number;
}

const EMPTY_RESULT: UseTraceSpansResult = {
  spans: [],
  durationMs: 0,
};

const getDurationMs = (spans: TraceSpan[]): number => {
  let earliestStartMs = Number.POSITIVE_INFINITY;
  let latestEndMs = Number.NEGATIVE_INFINITY;

  for (const span of spans) {
    const startMs = Date.parse(span.start_time);
    if (!Number.isFinite(startMs)) {
      continue;
    }

    earliestStartMs = Math.min(earliestStartMs, startMs);
    latestEndMs = Math.max(latestEndMs, startMs + span.duration_ms);
  }

  if (!Number.isFinite(earliestStartMs) || !Number.isFinite(latestEndMs)) {
    return 0;
  }

  return latestEndMs - earliestStartMs;
};

export const useTraceSpans = (
  traceId: string | null,
  { search }: { search: DataPublicPluginStart['search']['search'] }
): { spans: TraceSpan[]; durationMs: number; isLoading: boolean; error: Error | null } => {
  const query = useQuery<UseTraceSpansResult, Error>({
    queryKey: ['llm-trace-waterfall', 'trace-spans', traceId],
    enabled: traceId != null,
    queryFn: async () => {
      if (traceId == null) {
        return EMPTY_RESULT;
      }

      const response = await lastValueFrom(
        search<TraceSearchRequest, TraceSearchResponse>({
          params: {
            index: 'traces-*',
            body: {
              query: { term: { trace_id: traceId } },
              sort: [{ '@timestamp': { order: 'asc' } }],
              size: 10000,
            },
          },
        })
      );

      const spans = (response.rawResponse?.hits?.hits ?? [])
        .map((hit) => {
          if (!hit._source) {
            return null;
          }

          return mapEsSourceToTraceSpan(hit._source, hit._id);
        })
        .filter((span): span is TraceSpan => span != null);

      return {
        spans,
        durationMs: getDurationMs(spans),
      };
    },
  });

  return {
    spans: query.data?.spans ?? EMPTY_RESULT.spans,
    durationMs: query.data?.durationMs ?? EMPTY_RESULT.durationMs,
    isLoading: traceId != null ? query.isLoading : false,
    error: query.error ?? null,
  };
};
