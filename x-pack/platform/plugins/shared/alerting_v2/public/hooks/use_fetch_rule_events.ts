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
import { ruleOverviewQueryKeys } from '../queries/alert_series_activity/query_keys';
import {
  buildRuleEventsEsqlQuery,
  type RuleEventRow,
} from '../queries/alert_series_activity/rule_events_query';
import { useFetchSeriesGroupingValues } from './use_fetch_series_grouping_values';
import type { SeriesGroupingValuesByHash } from '../queries/alert_series_activity/series_grouping_values_query';

const EMPTY_EVENTS: RuleEventRow[] = [];
const EMPTY_GROUPING_VALUES: SeriesGroupingValuesByHash = {};

/** Hard cap on raw events pulled for the rule overview Gantt chart. */
export const RULE_EVENTS_PAGE_SIZE = 5000;

export interface UseFetchRuleEventsOptions {
  ruleId: string | undefined;
  /** Visible window start (epoch ms). */
  gteMs: number;
  /** Visible window end (epoch ms). */
  lteMs: number;
  /** Rule's `grouping.fields`. Empty when the rule isn't grouped. */
  groupingFields?: readonly string[];
  pageSize?: number;
  data: DataPublicPluginStart;
}

/**
 * Fetches every alert event row for the rule inside the visible window,
 * plus per-`group_hash` grouping values for row labels. Returns the raw
 * event rows so the Gantt-data shaping step can split each episode into
 * state segments and emit a transition marker per event.
 */
export const useFetchRuleEvents = ({
  ruleId,
  gteMs,
  lteMs,
  groupingFields = [],
  pageSize = RULE_EVENTS_PAGE_SIZE,
  data,
}: UseFetchRuleEventsOptions) => {
  const enabled =
    Boolean(ruleId) && Number.isFinite(gteMs) && Number.isFinite(lteMs) && lteMs > gteMs;

  const eventsQuery = useQuery({
    queryKey: ruleOverviewQueryKeys.ruleEvents(ruleId ?? '', gteMs, lteMs, pageSize),
    enabled,
    queryFn: ({ signal }) =>
      runEsqlAsyncSearch({
        data,
        params: {
          query: buildRuleEventsEsqlQuery({ ruleId: ruleId!, gteMs, lteMs, pageSize }).print(
            'basic'
          ),
          time_zone: 'UTC',
        },
        abortSignal: signal,
      }),
    select: (raw) => esqlResponseToObjectRows<RuleEventRow>(raw),
  });

  const groupHashes = useMemo(() => {
    const set = new Set<string>();
    for (const row of eventsQuery.data ?? []) set.add(row.group_hash);
    return [...set];
  }, [eventsQuery.data]);

  const groupingValuesQuery = useFetchSeriesGroupingValues({
    ruleId,
    groupHashes,
    groupingFields,
    gteMs,
    lteMs,
    enabled: enabled && eventsQuery.isSuccess,
    data,
  });

  // React Query v4 reports `isLoading=true` for disabled queries — guard the
  // events piece on `enabled` so an unmounted/disabled state doesn't pin the
  // spinner. groupingValuesQuery already gates internally.
  const isLoading = (enabled && eventsQuery.isLoading) || groupingValuesQuery.isLoading;
  const isError = eventsQuery.isError || groupingValuesQuery.isError;

  return {
    events: eventsQuery.data ?? EMPTY_EVENTS,
    groupingValuesByHash: groupingValuesQuery.data ?? EMPTY_GROUPING_VALUES,
    isLoading,
    isError,
    refetch: () => {
      eventsQuery.refetch();
      groupingValuesQuery.refetch();
    },
  };
};
