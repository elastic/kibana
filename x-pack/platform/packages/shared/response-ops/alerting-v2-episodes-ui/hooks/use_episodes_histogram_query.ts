/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import dateMath from '@kbn/datemath';
import { useQuery } from '@kbn/react-query';
import type { TimeRange } from '@kbn/es-query';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { useSpaceId } from './use_space_id';
import {
  buildEpisodesHistogramQuery,
  HISTOGRAM_EPISODE_LIMIT,
  type EpisodesFilterState,
} from '../queries/episodes_query';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import {
  generateTimeBuckets,
  computeOverlapCounts,
  formatHistogramDatatable,
  type HistogramEpisodeRow,
} from '../utils/histogram_utils';

export interface UseEpisodesHistogramQueryOptions {
  services: {
    expressions: ExpressionsStart;
    spaces: SpacesPluginStart;
  };
  filterState: EpisodesFilterState;
  timeRange?: TimeRange;
  bucketInterval: string;
  breakdownField?: string;
}

export interface UseEpisodesHistogramQueryResult {
  table: Datatable | undefined;
  isLoading: boolean;
  error: Error | undefined;
  isCapHit: boolean;
  refetch: () => void;
}

export const useEpisodesHistogramQuery = ({
  services,
  filterState,
  timeRange,
  bucketInterval,
  breakdownField,
}: UseEpisodesHistogramQueryOptions): UseEpisodesHistogramQueryResult => {
  const spaceId = useSpaceId(services.spaces);

  const {
    data: rawEpisodes,
    isLoading,
    error,
    refetch,
  } = useQuery<HistogramEpisodeRow[], Error>({
    // bucketInterval is used for client-side bucketing only — omitting from queryKey is intentional
    queryKey: ['episodesHistogram', spaceId, filterState, timeRange, breakdownField],
    queryFn: async ({ signal }) => {
      const query = buildEpisodesHistogramQuery(spaceId, filterState, breakdownField);
      return executeEsqlQuery<HistogramEpisodeRow>({
        expressions: services.expressions,
        query,
        input: {
          type: 'kibana_context' as const,
          esqlVariables: [],
          ...(timeRange ? { timeRange } : {}),
        },
        abortSignal: signal,
      });
    },
  });

  const isCapHit = (rawEpisodes?.length ?? 0) >= HISTOGRAM_EPISODE_LIMIT;

  const table = useMemo<Datatable | undefined>(() => {
    if (!rawEpisodes) return undefined;
    const startMs =
      dateMath.parse(timeRange?.from ?? 'now-24h')?.valueOf() ?? Date.now() - 86_400_000;
    const endMs =
      dateMath.parse(timeRange?.to ?? 'now', { roundUp: true })?.valueOf() ?? Date.now();
    const buckets = generateTimeBuckets(startMs, endMs, bucketInterval);
    const counts = computeOverlapCounts(rawEpisodes, buckets, breakdownField);
    return formatHistogramDatatable(counts, breakdownField);
  }, [rawEpisodes, timeRange, bucketInterval, breakdownField]);

  return {
    table,
    isLoading,
    error: error ?? undefined,
    isCapHit,
    refetch,
  };
};
