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
  ALERT_TIMELINE_TOP_N_DEFAULT,
  type AlertTimelinePhaseRow,
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
import { buildEpisodePhasesQuery } from '../queries/alert_series_activity/episode_phases_query';
import {
  buildAlertTimelineSummaryQuery,
  parseAlertTimelineSummaryRow,
  type AlertTimelineSummaryEsqlRow,
} from '../queries/alert_series_activity/alert_timeline_summary_query';
import { useFetchSeriesGroupingValues } from './use_fetch_series_grouping_values';
import type { SeriesGroupingValuesByHash } from '../queries/alert_series_activity/series_grouping_values_query';

const EMPTY_PHASES: AlertTimelinePhaseRow[] = [];
const EMPTY_GROUPING_VALUES: SeriesGroupingValuesByHash = {};
const EMPTY_SUMMARY: AlertTimelineSummary = {
  episodesStarted: 0,
  recovered: 0,
  stillOpen: 0,
  medianDurationMs: 0,
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * How far before the display window the phase query reaches when resolving each
 * episode's true start. Scoped by `episode.id`, so a wider lookback stays cheap;
 * an episode older than this floor renders as an honest "unknown start". At least
 * a week, or 3× the window — whichever is larger — so short windows still catch
 * older episodes and long windows scale.
 */
const phaseLookbackFloor = (gteMs: number, lteMs: number): number =>
  gteMs - Math.max((lteMs - gteMs) * 3, SEVEN_DAYS_MS);

export interface UseFetchRuleEventsOptions {
  ruleId: string | undefined;
  gteMs: number;
  lteMs: number;
  groupingFields?: readonly string[];
  topN?: number;
  /** Max episodes drawn per series (lane). Defaults to {@link MAX_EPISODES_PER_LANE}. */
  perLaneLimit?: number;
  data: DataPublicPluginStart;
}

export const useFetchRuleEvents = ({
  ruleId,
  gteMs,
  lteMs,
  groupingFields = [],
  topN = ALERT_TIMELINE_TOP_N_DEFAULT,
  perLaneLimit = MAX_EPISODES_PER_LANE,
  data,
}: UseFetchRuleEventsOptions) => {
  const enabled =
    Boolean(ruleId) && Number.isFinite(gteMs) && Number.isFinite(lteMs) && lteMs > gteMs;

  const lookbackFloorMs = phaseLookbackFloor(gteMs, lteMs);

  // --- 1. Top-N series query (runs first) — picks the lanes by recency. ---
  const topNSeriesQuery = useQuery({
    queryKey: ruleOverviewQueryKeys.topNSeries(ruleId ?? '', gteMs, lteMs),
    enabled,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) =>
      runEsqlAsyncSearch({
        data,
        params: {
          query: buildTopNSeriesQuery({ ruleId: ruleId!, gteMs, lteMs }).print('basic'),
          time_zone: 'UTC',
        },
        abortSignal: signal,
      }),
    select: (raw) => esqlResponseToObjectRows<TopNSeriesRow>(raw),
  });

  const { topNHashes, totalSeriesCount } = useMemo(() => {
    const allRows = topNSeriesQuery.data ?? [];
    return {
      topNHashes: allRows.slice(0, topN).map((r) => r.group_hash),
      totalSeriesCount: allRows.length,
    };
  }, [topNSeriesQuery.data, topN]);

  // --- 2. Episode selection (depends on top-N hashes) — the episodes to draw,
  // capped per lane so a busy series can't crowd out its neighbours. ---
  const selectionEnabled = enabled && topNSeriesQuery.isSuccess && topNHashes.length > 0;

  const selectionQuery = useQuery({
    queryKey: ruleOverviewQueryKeys.episodeSelection(
      ruleId ?? '',
      gteMs,
      lteMs,
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
            gteMs,
            lteMs,
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

  // --- 3. Episode phases (depends on the selected episode IDs) — one row per
  // status phase, over a wider lookback so every bar gets its true left edge.
  // Replaces the old raw-events + start-anchor queries. ---
  const phasesEnabled =
    selectionEnabled && selectionQuery.isSuccess && selectedEpisodeIds.length > 0;

  const phasesQuery = useQuery({
    queryKey: ruleOverviewQueryKeys.episodePhases(
      ruleId ?? '',
      lookbackFloorMs,
      lteMs,
      selectedEpisodeIds
    ),
    enabled: phasesEnabled,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) =>
      runEsqlAsyncSearch({
        data,
        params: {
          query: buildEpisodePhasesQuery({
            ruleId: ruleId!,
            gteMs: lookbackFloorMs,
            lteMs,
            episodeIds: selectedEpisodeIds,
          }).print('basic'),
          time_zone: 'UTC',
        },
        abortSignal: signal,
      }),
    select: (raw) => esqlResponseToObjectRows<AlertTimelinePhaseRow>(raw),
  });

  // --- 4. Summary aggregation query (independent of top-N) ---
  const summaryQuery = useQuery({
    queryKey: ruleOverviewQueryKeys.timelineSummary(ruleId ?? '', gteMs, lteMs),
    enabled,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) =>
      runEsqlAsyncSearch({
        data,
        params: {
          query: buildAlertTimelineSummaryQuery({ ruleId: ruleId!, gteMs, lteMs }).print('basic'),
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
    (phasesEnabled && phasesQuery.isLoading) ||
    (enabled && summaryQuery.isLoading) ||
    groupingValuesQuery.isLoading;

  const isError =
    topNSeriesQuery.isError ||
    selectionQuery.isError ||
    phasesQuery.isError ||
    summaryQuery.isError ||
    groupingValuesQuery.isError;

  return {
    phases: phasesQuery.data ?? EMPTY_PHASES,
    groupingValuesByHash: groupingValuesQuery.data ?? EMPTY_GROUPING_VALUES,
    summary: summaryQuery.data ?? EMPTY_SUMMARY,
    totalSeriesCount,
    isLoading,
    isError,
    refetch: () => {
      topNSeriesQuery.refetch();
      selectionQuery.refetch();
      phasesQuery.refetch();
      summaryQuery.refetch();
      groupingValuesQuery.refetch();
    },
  };
};
