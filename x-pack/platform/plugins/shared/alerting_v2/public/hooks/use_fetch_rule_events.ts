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
  type AlertTimelineSummary,
} from '@kbn/alerting-v2-episodes-ui/alert_timeline';
import { ruleOverviewQueryKeys } from '../queries/alert_series_activity/query_keys';
import {
  buildRuleEventsEsqlQuery,
  type RuleEventRow,
} from '../queries/alert_series_activity/rule_events_query';
import {
  buildTopNSeriesQuery,
  type TopNSeriesRow,
} from '../queries/alert_series_activity/top_n_series_query';
import {
  buildAlertTimelineSummaryQuery,
  parseAlertTimelineSummaryRow,
  type AlertTimelineSummaryEsqlRow,
} from '../queries/alert_series_activity/alert_timeline_summary_query';
import { useFetchSeriesGroupingValues } from './use_fetch_series_grouping_values';
import type { SeriesGroupingValuesByHash } from '../queries/alert_series_activity/series_grouping_values_query';

const EMPTY_EVENTS: RuleEventRow[] = [];
const EMPTY_GROUPING_VALUES: SeriesGroupingValuesByHash = {};
const EMPTY_SUMMARY: AlertTimelineSummary = {
  episodesStarted: 0,
  recovered: 0,
  stillOpen: 0,
  medianDurationMs: 0,
};

/** Hard cap on raw events pulled for the rule overview alert timeline. */
export const RULE_EVENTS_PAGE_SIZE = 5000;

export interface UseFetchRuleEventsOptions {
  ruleId: string | undefined;
  gteMs: number;
  lteMs: number;
  /** Lookback start (epoch ms) for raw events only. Falls back to `gteMs`. */
  eventGteMs?: number;
  groupingFields?: readonly string[];
  topN?: number;
  pageSize?: number;
  data: DataPublicPluginStart;
}

export const useFetchRuleEvents = ({
  ruleId,
  gteMs,
  lteMs,
  eventGteMs,
  groupingFields = [],
  topN = ALERT_TIMELINE_TOP_N_DEFAULT,
  pageSize = RULE_EVENTS_PAGE_SIZE,
  data,
}: UseFetchRuleEventsOptions) => {
  const rawEventsGteMs = eventGteMs ?? gteMs;

  const enabled =
    Boolean(ruleId) && Number.isFinite(gteMs) && Number.isFinite(lteMs) && lteMs > gteMs;

  // --- 1. Top-N series query (runs first) ---
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

  // --- 2. Filtered events query (depends on top-N hashes) ---
  const eventsEnabled = enabled && topNSeriesQuery.isSuccess && topNHashes.length > 0;

  const eventsQuery = useQuery({
    queryKey: ruleOverviewQueryKeys.ruleEvents(
      ruleId ?? '',
      rawEventsGteMs,
      lteMs,
      pageSize,
      topNHashes
    ),
    enabled: eventsEnabled,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) =>
      runEsqlAsyncSearch({
        data,
        params: {
          query: buildRuleEventsEsqlQuery({
            ruleId: ruleId!,
            gteMs: rawEventsGteMs,
            lteMs,
            pageSize,
            groupHashes: topNHashes,
          }).print('basic'),
          time_zone: 'UTC',
        },
        abortSignal: signal,
      }),
    select: (raw) => esqlResponseToObjectRows<RuleEventRow>(raw),
  });

  // --- 3. Summary aggregation query (independent of top-N) ---
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

  // --- 4. Grouping values (depends on top-N hashes; untimed — values are hash-invariant) ---
  const groupingValuesQuery = useFetchSeriesGroupingValues({
    ruleId,
    groupHashes: topNHashes,
    groupingFields,
    enabled: enabled && topNSeriesQuery.isSuccess,
    data,
  });

  const isLoading =
    (enabled && topNSeriesQuery.isLoading) ||
    (eventsEnabled && eventsQuery.isLoading) ||
    (enabled && summaryQuery.isLoading) ||
    groupingValuesQuery.isLoading;

  const isError =
    topNSeriesQuery.isError ||
    eventsQuery.isError ||
    summaryQuery.isError ||
    groupingValuesQuery.isError;

  return {
    events: eventsQuery.data ?? EMPTY_EVENTS,
    groupingValuesByHash: groupingValuesQuery.data ?? EMPTY_GROUPING_VALUES,
    summary: summaryQuery.data ?? EMPTY_SUMMARY,
    totalSeriesCount,
    isLoading,
    isError,
    refetch: () => {
      topNSeriesQuery.refetch();
      eventsQuery.refetch();
      summaryQuery.refetch();
      groupingValuesQuery.refetch();
    },
  };
};
