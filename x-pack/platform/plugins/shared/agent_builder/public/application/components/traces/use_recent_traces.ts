/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery } from '@kbn/react-query';
import { lastValueFrom } from 'rxjs';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';

/**
 * A single row rendered by the "recent traces" table on the standalone trace
 * viewer page. One row = one distinct trace, represented by whichever span for
 * that trace is most recent (see `useRecentTraces` for why we use collapse).
 */
export interface RecentTrace {
  traceId: string;
  timestamp: string;
  rootSpanName: string;
  durationMs: number;
}

const NANOSECONDS_PER_MILLISECOND = 1_000_000;
const DEFAULT_LIMIT = 10;
const STALE_TIME_MS = 15_000;

interface RecentTracesSearchResponse {
  rawResponse?: {
    hits?: {
      hits?: Array<{
        _source?: {
          trace_id?: string;
          '@timestamp'?: string;
          name?: string;
          duration?: number;
          parent_span_id?: string;
          inner_hits?: unknown;
        };
        fields?: Record<string, unknown>;
        inner_hits?: {
          root?: {
            hits?: {
              hits?: Array<{
                _source?: {
                  name?: string;
                  '@timestamp'?: string;
                  duration?: number;
                };
              }>;
            };
          };
        };
      }>;
    };
  };
}

interface UseRecentTracesArgs {
  search: DataPublicPluginStart['search']['search'];
  index?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * Fetch the N most recent traces in the given index by collapsing on `trace_id`.
 *
 * Collapse sorted by `@timestamp` desc returns the most recent span per trace
 * (Elasticsearch's field collapsing feature is the cheapest way to get "top N
 * distinct trace_ids" without an aggregation). We also request an `inner_hits`
 * whose `sort` is ascending, so the first inner hit is the *earliest* span of
 * that trace — this gives us the trace's start time and, in the common case,
 * the root span's name (e.g. `invoke_agent elastic-ai-agent`) for the label.
 *
 * `parent_span_id` is not required to be indexed as a keyword; we rely purely
 * on time ordering, which works even when the root span is dropped from the
 * shard for some reason.
 */
export const useRecentTraces = ({
  search,
  index,
  limit = DEFAULT_LIMIT,
  enabled = true,
}: UseRecentTracesArgs): {
  traces: RecentTrace[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} => {
  const fetchRecentTraces = useCallback(async (): Promise<RecentTrace[]> => {
    if (!index) return [];
    const response = (await lastValueFrom(
      search({
        params: {
          index,
          body: {
            size: limit,
            sort: [{ '@timestamp': { order: 'desc' } }],
            collapse: {
              field: 'trace_id',
              inner_hits: {
                name: 'root',
                size: 1,
                sort: [{ '@timestamp': { order: 'asc' } }],
                _source: ['name', '@timestamp', 'duration'],
              },
            },
            _source: ['trace_id', '@timestamp', 'name', 'duration'],
          },
        },
      })
    )) as RecentTracesSearchResponse;

    const hits = response.rawResponse?.hits?.hits ?? [];
    return hits.flatMap((hit) => {
      const traceId = hit._source?.trace_id;
      if (!traceId) return [];
      const earliest = hit.inner_hits?.root?.hits?.hits?.[0]?._source;
      return [
        {
          traceId,
          timestamp: earliest?.['@timestamp'] ?? hit._source?.['@timestamp'] ?? '',
          rootSpanName: earliest?.name ?? hit._source?.name ?? '-',
          durationMs:
            (earliest?.duration ?? hit._source?.duration ?? 0) / NANOSECONDS_PER_MILLISECOND,
        },
      ];
    });
  }, [index, limit, search]);

  const query = useQuery<RecentTrace[], Error>({
    queryKey: ['agent-builder', 'recent-traces', index, limit],
    enabled: enabled && Boolean(index),
    staleTime: STALE_TIME_MS,
    queryFn: fetchRecentTraces,
  });

  return {
    traces: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ?? null,
    refetch: query.refetch,
  };
};
