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
import type { HttpStart } from '@kbn/core-http-browser';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { EpisodesFilterState } from '@kbn/alerting-v2-common-queries';
import { useSpaceId } from './use_space_id';
import { queryKeys } from '../query_keys';
import { buildEpisodesHistogramQuery } from '../queries/episodes_query';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { fetchV1AlertsHistogram } from '../apis/classic_alerts_api';
import {
  generateTimeBuckets,
  computeOverlapCounts,
  formatHistogramDatatable,
  type HistogramEpisodeRow,
} from '../utils/histogram_utils';
import { HISTOGRAM_EPISODE_LIMIT } from '../constants';
import { CLASSIC_ALERTS_HISTOGRAM_LIMIT } from '../classic_alerts/constants';

interface HistogramQueryData {
  rows: HistogramEpisodeRow[];
  isCapHit: boolean;
}

export interface UseEpisodesHistogramQueryOptions {
  services: {
    expressions: ExpressionsStart;
    spaces: SpacesPluginStart;
    http: HttpStart;
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
    data: queryResult,
    isLoading,
    error,
    refetch,
  } = useQuery<HistogramQueryData, Error>({
    // bucketInterval is used for client-side bucketing only — omitted from queryKey intentionally
    queryKey: queryKeys.histogram(spaceId, filterState, timeRange, breakdownField),
    queryFn: async ({ signal }) => {
      // Fetch v2 and classic (v1) histogram rows in parallel and concatenate them
      // so the histogram reflects both. The v1 read (RBAC enforced server-side) is
      // best-effort.
      const [v2Rows, v1Rows] = await Promise.all([
        executeEsqlQuery<HistogramEpisodeRow>({
          expressions: services.expressions,
          query: buildEpisodesHistogramQuery(spaceId, filterState, breakdownField).print('basic'),
          input: {
            type: 'kibana_context' as const,
            esqlVariables: [],
            ...(timeRange ? { timeRange } : {}),
          },
          abortSignal: signal,
        }),
        fetchV1AlertsHistogram({
          services,
          filterState,
          timeRange,
          breakdownField,
          abortSignal: signal,
        }).catch(() => [] as HistogramEpisodeRow[]),
      ]);

      return {
        rows: [...v2Rows, ...v1Rows],
        isCapHit:
          v2Rows.length >= HISTOGRAM_EPISODE_LIMIT ||
          v1Rows.length >= CLASSIC_ALERTS_HISTOGRAM_LIMIT,
      };
    },
  });

  const rawEpisodes = queryResult?.rows;
  const isCapHit = queryResult?.isCapHit ?? false;

  const table = useMemo<Datatable | undefined>(() => {
    if (!rawEpisodes) return undefined;
    const startMs =
      dateMath.parse(timeRange?.from ?? 'now-24h')?.valueOf() ?? Date.now() - 86_400_000;
    const endMs =
      dateMath.parse(timeRange?.to ?? 'now', { roundUp: true })?.valueOf() ?? Date.now();
    const buckets = generateTimeBuckets(startMs, endMs, bucketInterval);
    const counts = computeOverlapCounts(rawEpisodes, buckets, breakdownField);

    // When a breakdown is active, future buckets (no overlapping episodes) produce no rows.
    // Fill those gaps with zero-count entries for each category that appears in other buckets
    // so the chart x-axis always covers the full selected time range.
    if (breakdownField && counts.length > 0) {
      const knownCategories = [...new Set(counts.map((c) => c.breakdown!))];
      const coveredBuckets = new Set(counts.map((c) => c.bucketStart));
      for (const { start } of buckets) {
        if (!coveredBuckets.has(start)) {
          for (const breakdown of knownCategories) {
            counts.push({ bucketStart: start, count: 0, breakdown });
          }
        }
      }
    }

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
