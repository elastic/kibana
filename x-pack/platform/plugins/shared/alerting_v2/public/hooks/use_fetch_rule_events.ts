/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useQuery } from '@kbn/react-query';
import { runEsqlAsyncSearch } from '@kbn/alerting-v2-episodes-ui/utils/run_esql_async_search';
import { esqlResponseToObjectRows } from '@kbn/alerting-v2-episodes-ui/utils/esql_response_to_rows';
import {
  type AlertTimelineEventRow,
  type AlertTimelineSummary,
} from '@kbn/alerting-v2-episodes-ui/alert_timeline';
import { ruleOverviewQueryKeys } from '../queries/alert_series_activity/query_keys';
import {
  buildTopNSeriesQuery,
  type TopNSeriesRow,
} from '../queries/alert_series_activity/top_n_series_query';
import {
  buildEpisodeSelectionQuery,
  MAX_EPISODES_PER_LANE,
  type EpisodeSelectionRow,
} from '../queries/alert_series_activity/episode_selection_query';
import { buildRuleEventsQuery } from '../queries/alert_series_activity/rule_events_query';
import {
  buildAlertTimelineSummaryQuery,
  parseAlertTimelineSummaryRow,
  type AlertTimelineSummaryEsqlRow,
} from '../queries/alert_series_activity/alert_timeline_summary_query';
import { useFetchSeriesGroupingValues } from './use_fetch_series_grouping_values';
import type { SeriesGroupingValuesByHash } from '../queries/alert_series_activity/series_grouping_values_query';

const EMPTY_EVENTS: AlertTimelineEventRow[] = [];
const EMPTY_GROUPING_VALUES: SeriesGroupingValuesByHash = {};
const EMPTY_SUMMARY: AlertTimelineSummary = {
  episodesStarted: 0,
  recovered: 0,
  stillOpen: 0,
  medianDurationMs: 0,
};

export interface UseFetchRuleEventsOptions {
  ruleId: string | undefined;
  windowStartMs: number;
  windowEndMs: number;
  groupingFields?: readonly string[];
  /** Max episodes drawn per series (lane). Defaults to {@link MAX_EPISODES_PER_LANE}. */
  perLaneLimit?: number;
  data: DataPublicPluginStart;
}

export const useFetchRuleEvents = ({
  ruleId,
  windowStartMs,
  windowEndMs,
  groupingFields = [],
  perLaneLimit = MAX_EPISODES_PER_LANE,
  data,
}: UseFetchRuleEventsOptions) => {
  const enabled = Boolean(ruleId) && windowEndMs > windowStartMs;

  // --- 1. Top-N series query (runs first) — picks the lanes by recency. ---
  const topNSeriesQuery = useQuery({
    queryKey: ruleOverviewQueryKeys.topNSeries(ruleId ?? '', windowStartMs, windowEndMs),
    enabled,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) =>
      runEsqlAsyncSearch({
        data,
        params: {
          query: buildTopNSeriesQuery({
            ruleId: ruleId!,
            windowStartMs,
            windowEndMs,
          }).print('basic'),
          time_zone: 'UTC',
        },
        abortSignal: signal,
      }),
    select: (raw) => esqlResponseToObjectRows<TopNSeriesRow>(raw),
  });

  // The query already caps the rows to the rendered lane count, most-recently-active first.
  const topNHashes = useMemo(
    () => (topNSeriesQuery.data ?? []).map((r) => r.group_hash),
    [topNSeriesQuery.data]
  );

  // --- 2. Episode selection (depends on top-N hashes) — the episodes to draw,
  // capped per lane so a busy series can't crowd out its neighbours. ---
  const selectionEnabled = enabled && topNSeriesQuery.isSuccess && topNHashes.length > 0;

  const selectionQuery = useQuery({
    queryKey: ruleOverviewQueryKeys.episodeSelection(
      ruleId ?? '',
      windowStartMs,
      windowEndMs,
      perLaneLimit,
      topNHashes
    ),
    enabled: selectionEnabled,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) =>
      runEsqlAsyncSearch({
        data,
        params: {
          query: buildEpisodeSelectionQuery({
            ruleId: ruleId!,
            windowStartMs,
            windowEndMs,
            groupHashes: topNHashes,
            perLaneLimit,
          }).print('basic'),
          time_zone: 'UTC',
        },
        abortSignal: signal,
      }),
    select: (raw) => esqlResponseToObjectRows<EpisodeSelectionRow>(raw),
  });

  const selectedEpisodeIds = useMemo(
    () => (selectionQuery.data ?? []).map((r) => r['episode.id']),
    [selectionQuery.data]
  );

  // --- 3. Rule events (depends on the selected episode IDs) — all raw events up
  // to the display window end, including earlier events needed to reconstruct a
  // status that began before the visible window. ---
  const eventsEnabled =
    selectionEnabled && selectionQuery.isSuccess && selectedEpisodeIds.length > 0;

  const eventsQuery = useQuery({
    queryKey: ruleOverviewQueryKeys.ruleEvents(ruleId ?? '', windowEndMs, selectedEpisodeIds),
    enabled: eventsEnabled,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) =>
      runEsqlAsyncSearch({
        data,
        params: {
          query: buildRuleEventsQuery({
            ruleId: ruleId!,
            windowEndMs,
            episodeIds: selectedEpisodeIds,
          }).print('basic'),
          time_zone: 'UTC',
        },
        abortSignal: signal,
      }),
    select: (raw) => esqlResponseToObjectRows<AlertTimelineEventRow>(raw),
  });

  // --- 4. Summary aggregation query (independent of top-N) ---
  const summaryQuery = useQuery({
    queryKey: ruleOverviewQueryKeys.timelineSummary(ruleId ?? '', windowStartMs, windowEndMs),
    enabled,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) =>
      runEsqlAsyncSearch({
        data,
        params: {
          query: buildAlertTimelineSummaryQuery({
            ruleId: ruleId!,
            windowStartMs,
            windowEndMs,
          }).print('basic'),
          time_zone: 'UTC',
        },
        abortSignal: signal,
      }),
    select: (raw) => {
      const rows = esqlResponseToObjectRows<AlertTimelineSummaryEsqlRow>(raw);
      return parseAlertTimelineSummaryRow(rows[0]);
    },
  });

  // --- 5. Grouping values (depends on top-N hashes; untimed — values are hash-invariant) ---
  const groupingValuesQuery = useFetchSeriesGroupingValues({
    ruleId,
    groupHashes: topNHashes,
    groupingFields,
    enabled: enabled && topNSeriesQuery.isSuccess,
    data,
  });

  const isLoading =
    (enabled && topNSeriesQuery.isLoading) ||
    (selectionEnabled && selectionQuery.isLoading) ||
    (eventsEnabled && eventsQuery.isLoading) ||
    (enabled && summaryQuery.isLoading) ||
    groupingValuesQuery.isLoading;

  const isError =
    topNSeriesQuery.isError ||
    selectionQuery.isError ||
    eventsQuery.isError ||
    summaryQuery.isError ||
    groupingValuesQuery.isError;

  return {
    events: eventsQuery.data ?? EMPTY_EVENTS,
    groupingValuesByHash: groupingValuesQuery.data ?? EMPTY_GROUPING_VALUES,
    summary: summaryQuery.data ?? EMPTY_SUMMARY,
    isLoading,
    isError,
    refetch: () => {
      topNSeriesQuery.refetch();
      selectionQuery.refetch();
      eventsQuery.refetch();
      summaryQuery.refetch();
      groupingValuesQuery.refetch();
    },
  };
};
