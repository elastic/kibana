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
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { EpisodesFilterState } from '@kbn/alerting-v2-common-queries';
import { useSpaceId } from './use_space_id';
import { queryKeys } from '../query_keys';
import { HISTOGRAM_EPISODE_LIMIT } from '../constants';
import { buildEpisodesHistogramQuery } from '../queries/episodes_query';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import {
  EMPTY_SOURCE_ERRORS,
  fetchFromV2AndSource,
  type EpisodeSourceError,
} from '../utils/fetch_from_sources';
import { buildAlertEventsTimeRangeFilter } from '../utils/build_alert_events_time_range_filter';
import {
  useAdditionalEpisodesDataSource,
  useQueryV2Source,
} from '../context/episode_data_source_context';
import { useToastSourceErrors } from './use_toast_source_errors';
import {
  clampBucketInterval,
  countEpisodesByBreakdown,
  generateTimeBuckets,
  computeOverlapCounts,
  formatHistogramDatatable,
  limitBreakdownSeries,
  mergeBucketCounts,
  sumBreakdownTotals,
  type HistogramBucketCount,
  type HistogramEpisodeRow,
  type TimeBucket,
} from '../utils/histogram_utils';

interface HistogramQueryData {
  counts: HistogramBucketCount[];
  buckets: TimeBucket[];
  isCapHit: boolean;
  sourceErrors: EpisodeSourceError[];
}

const resolveHistogramBuckets = (
  timeRange: TimeRange | undefined,
  bucketInterval: string,
  nowMs: number
): TimeBucket[] => {
  const startMs = dateMath.parse(timeRange?.from ?? 'now-24h')?.valueOf() ?? nowMs - 86_400_000;
  const endMs = dateMath.parse(timeRange?.to ?? 'now', { roundUp: true })?.valueOf() ?? nowMs;
  return generateTimeBuckets(startMs, endMs, clampBucketInterval(startMs, endMs, bucketInterval));
};

export interface UseEpisodesHistogramQueryOptions {
  services: {
    expressions: ExpressionsStart;
    spaces: SpacesPluginStart;
    http: HttpStart;
    notifications?: NotificationsStart;
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
  sourceErrors: EpisodeSourceError[];
}

export const useEpisodesHistogramQuery = ({
  services,
  filterState,
  timeRange,
  bucketInterval,
  breakdownField,
}: UseEpisodesHistogramQueryOptions): UseEpisodesHistogramQueryResult => {
  const additionalEpisodesDataSource = useAdditionalEpisodesDataSource();
  const queryV2Source = useQueryV2Source();
  const spaceId = useSpaceId(services.spaces);

  const {
    data: queryResult,
    isLoading,
    error,
    refetch,
  } = useQuery<HistogramQueryData, Error>({
    queryKey: queryKeys.histogram(
      spaceId,
      filterState,
      timeRange,
      breakdownField,
      bucketInterval,
      additionalEpisodesDataSource?.id,
      queryV2Source
    ),
    queryFn: async ({ signal }) => {
      const nowMs = Date.now();
      const buckets = resolveHistogramBuckets(timeRange, bucketInterval, nowMs);
      const timeRangeFilter = buildAlertEventsTimeRangeFilter(timeRange);
      const { v2, additional, errors } = await fetchFromV2AndSource({
        v2: () =>
          executeEsqlQuery<HistogramEpisodeRow>({
            expressions: services.expressions,
            query: buildEpisodesHistogramQuery(spaceId, filterState, breakdownField).print('basic'),
            input: {
              type: 'kibana_context' as const,
              esqlVariables: [],
              ...(timeRangeFilter ? { filters: [timeRangeFilter] } : {}),
            },
            abortSignal: signal,
          }),
        source: additionalEpisodesDataSource,
        fromSource: (source) =>
          source.fetchHistogram?.({
            services,
            filterState,
            timeRange,
            breakdownField,
            buckets,
            nowMs,
            abortSignal: signal,
          }),
        queryV2Source,
      });

      const v2Rows = v2 ?? [];
      const counts = mergeBucketCounts(
        computeOverlapCounts(v2Rows, buckets, breakdownField, nowMs),
        ...additional.map((histogram) => histogram.counts)
      );
      const breakdownTotals = breakdownField
        ? sumBreakdownTotals(
            countEpisodesByBreakdown(v2Rows, breakdownField),
            ...additional.map((histogram) => histogram.breakdownTotals ?? {})
          )
        : undefined;

      return {
        counts: breakdownTotals ? limitBreakdownSeries(counts, breakdownTotals) : counts,
        buckets,
        isCapHit:
          v2Rows.length >= HISTOGRAM_EPISODE_LIMIT || additional.some(({ isCapHit }) => isCapHit),
        sourceErrors: errors,
      };
    },
  });

  const isCapHit = queryResult?.isCapHit ?? false;

  const table = useMemo<Datatable | undefined>(() => {
    if (!queryResult) return undefined;
    const { buckets } = queryResult;
    const counts = [...queryResult.counts];

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
  }, [queryResult, breakdownField]);

  const sourceErrors = queryResult?.sourceErrors ?? EMPTY_SOURCE_ERRORS;
  useToastSourceErrors(sourceErrors, services.notifications?.toasts, 'histogram');

  return {
    table,
    isLoading,
    error: error ?? undefined,
    isCapHit,
    refetch,
    sourceErrors,
  };
};
