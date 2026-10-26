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
  applyEpisodeStarts,
  makeEpisodeStartKey,
  type AlertTimelinePhaseRow,
  type AlertTimelineSummary,
} from '@kbn/alerting-v2-episodes-ui/alert_timeline';
import { ruleOverviewQueryKeys } from '../queries/alert_series_activity/query_keys';
import {
  buildTopNSeriesQuery,
  type TopNSeriesRow,
} from '../queries/alert_series_activity/top_n_series_query';
import {
  buildAlertSelectionQuery,
  MAX_ALERTS_PER_LANE,
  type AlertSelectionRow,
} from '../queries/alert_series_activity/alert_selection_query';
import { buildAlertPhasesQuery } from '../queries/alert_series_activity/alert_phases_query';
import {
  buildAlertStartsQuery,
  type AlertStartRow,
} from '../queries/alert_series_activity/alert_starts_query';
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

export interface UseFetchRuleEventsOptions {
  ruleId: string | undefined;
  windowStartMs: number;
  windowEndMs: number;
  groupingFields?: readonly string[];
  /** Max alerts drawn per series (lane). Defaults to {@link MAX_ALERTS_PER_LANE}. */
  perLaneLimit?: number;
  data: DataPublicPluginStart;
}

export const useFetchRuleEvents = ({
  ruleId,
  windowStartMs,
  windowEndMs,
  groupingFields = [],
  perLaneLimit = MAX_ALERTS_PER_LANE,
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

  // --- 2. Alert selection (depends on top-N hashes) — the alerts to draw,
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
          query: buildAlertSelectionQuery({
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
    select: (raw) => esqlResponseToObjectRows<AlertSelectionRow>(raw),
  });

  const selectedAlertIds = useMemo(
    () => (selectionQuery.data ?? []).map((r) => r['episode.id']),
    [selectionQuery.data]
  );

  // --- 3. Alert phases (depends on the selected alert IDs) — one row per
  // status phase, bounded to the display window for *drawing* the segments. The
  // true start of each phase comes from the untimed starts query (step 3b). ---
  const phasesEnabled = selectionEnabled && selectionQuery.isSuccess && selectedAlertIds.length > 0;

  const phasesQuery = useQuery({
    queryKey: ruleOverviewQueryKeys.episodePhases(
      ruleId ?? '',
      windowStartMs,
      windowEndMs,
      selectedAlertIds
    ),
    enabled: phasesEnabled,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) =>
      runEsqlAsyncSearch({
        data,
        params: {
          query: buildAlertPhasesQuery({
            ruleId: ruleId!,
            windowStartMs,
            windowEndMs,
            alertIds: selectedAlertIds,
          }).print('basic'),
          time_zone: 'UTC',
        },
        abortSignal: signal,
      }),
    select: (raw) => esqlResponseToObjectRows<AlertTimelinePhaseRow>(raw),
  });

  // --- 3b. Alert starts (depends on the selected alert IDs) — each alert's
  // true MIN(@timestamp) per status, UNTIMED so the start is independent of the
  // display window. Sibling to the phases query (same gate, no dependency between
  // them) → runs in parallel. Merged into the phase rows below. ---
  const startsQuery = useQuery({
    queryKey: ruleOverviewQueryKeys.episodeStarts(ruleId ?? '', selectedAlertIds),
    enabled: phasesEnabled,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) =>
      runEsqlAsyncSearch({
        data,
        params: {
          query: buildAlertStartsQuery({
            ruleId: ruleId!,
            alertIds: selectedAlertIds,
          }).print('basic'),
          time_zone: 'UTC',
        },
        abortSignal: signal,
      }),
    select: (raw) => esqlResponseToObjectRows<AlertStartRow>(raw),
  });

  // Per-(episode, status) true start, keyed for the merge below.
  const startsMs = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of startsQuery.data ?? []) {
      const startMs = Date.parse(row.episode_start);
      if (Number.isFinite(startMs)) {
        map.set(makeEpisodeStartKey(row['episode.id'], row['episode.status']), startMs);
      }
    }
    return map;
  }, [startsQuery.data]);

  // Phase rows for drawing, with each phase's left edge overlaid with its true
  // (window-independent) start. Degrades to the windowed start when unknown.
  const phases = useMemo(
    () => applyEpisodeStarts(phasesQuery.data ?? EMPTY_PHASES, startsMs),
    [phasesQuery.data, startsMs]
  );

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
    (phasesEnabled && phasesQuery.isLoading) ||
    // Wait for starts too, so a bar doesn't flash its windowed start then jump.
    (phasesEnabled && startsQuery.isLoading) ||
    (enabled && summaryQuery.isLoading) ||
    groupingValuesQuery.isLoading;

  // `startsQuery` is intentionally excluded: if only the (optional) true-start
  // overlay fails, the chart still renders correctly with windowed starts.
  const isError =
    topNSeriesQuery.isError ||
    selectionQuery.isError ||
    phasesQuery.isError ||
    summaryQuery.isError ||
    groupingValuesQuery.isError;

  return {
    phases,
    groupingValuesByHash: groupingValuesQuery.data ?? EMPTY_GROUPING_VALUES,
    summary: summaryQuery.data ?? EMPTY_SUMMARY,
    isLoading,
    isError,
    refetch: () => {
      topNSeriesQuery.refetch();
      selectionQuery.refetch();
      phasesQuery.refetch();
      startsQuery.refetch();
      summaryQuery.refetch();
      groupingValuesQuery.refetch();
    },
  };
};
