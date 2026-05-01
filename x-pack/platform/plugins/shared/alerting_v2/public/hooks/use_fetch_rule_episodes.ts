/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { useQuery } from '@kbn/react-query';
import { fetchAlertingEpisodes } from '@kbn/alerting-v2-episodes-ui/apis/fetch_alerting_episodes';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import { ruleOverviewQueryKeys } from '../queries/alert_series_activity/query_keys';
import { useFetchSeriesGroupingValues } from './use_fetch_series_grouping_values';
import type { SeriesGroupingValuesByHash } from '../queries/alert_series_activity/series_grouping_values_query';

const EMPTY_EPISODES: AlertEpisode[] = [];
const EMPTY_GROUPING_VALUES: SeriesGroupingValuesByHash = {};

/** Hard cap on the episodes pulled for the rule overview Gantt chart. */
export const RULE_EPISODES_PAGE_SIZE = 500;

export interface UseFetchRuleEpisodesOptions {
  ruleId: string | undefined;
  /** Visible window start (epoch ms). */
  gteMs: number;
  /** Visible window end (epoch ms). */
  lteMs: number;
  /** Rule's `grouping.fields`. Empty when the rule isn't grouped. */
  groupingFields?: readonly string[];
  pageSize?: number;
  data: DataPublicPluginStart;
  expressions: ExpressionsStart;
}

/**
 * Fetches the rule's episodes inside the visible window (via the shared
 * episodes ES|QL query, scoped by `ruleId`) and resolves per-`group_hash`
 * grouping values for row labels.
 *
 * Returns `episodes` and `groupingValuesByHash` as the two ingredients the
 * Gantt chart consumes; `deriveGanttData` produces chart-ready rows + summary.
 */
export const useFetchRuleEpisodes = ({
  ruleId,
  gteMs,
  lteMs,
  groupingFields = [],
  pageSize = RULE_EPISODES_PAGE_SIZE,
  data,
  expressions,
}: UseFetchRuleEpisodesOptions) => {
  const enabled =
    Boolean(ruleId) && Number.isFinite(gteMs) && Number.isFinite(lteMs) && lteMs > gteMs;

  const timeRange = useMemo(
    () => ({ from: new Date(gteMs).toISOString(), to: new Date(lteMs).toISOString() }),
    [gteMs, lteMs]
  );

  const filterState = useMemo(() => (ruleId ? { ruleId } : undefined), [ruleId]);

  const episodesQuery = useQuery({
    queryKey: ruleOverviewQueryKeys.ruleEpisodes(ruleId ?? '', gteMs, lteMs, pageSize),
    enabled,
    queryFn: ({ signal }) =>
      fetchAlertingEpisodes({
        pageSize,
        services: { expressions },
        filterState,
        timeRange,
        abortSignal: signal,
      }),
  });

  const groupHashes = useMemo(() => {
    const set = new Set<string>();
    for (const ep of episodesQuery.data ?? []) set.add(ep.group_hash);
    return [...set];
  }, [episodesQuery.data]);

  const groupingValuesQuery = useFetchSeriesGroupingValues({
    ruleId,
    groupHashes,
    groupingFields,
    gteMs,
    lteMs,
    enabled: enabled && episodesQuery.isSuccess,
    data,
  });

  // React Query v4 reports `isLoading=true` for disabled queries — guard the
  // episodes piece on `enabled` so an unmounted/disabled state doesn't pin the
  // spinner. groupingValuesQuery already gates internally.
  const isLoading = (enabled && episodesQuery.isLoading) || groupingValuesQuery.isLoading;
  const isError = episodesQuery.isError || groupingValuesQuery.isError;

  return {
    episodes: episodesQuery.data ?? EMPTY_EPISODES,
    groupingValuesByHash: groupingValuesQuery.data ?? EMPTY_GROUPING_VALUES,
    isLoading,
    isError,
    refetch: () => {
      episodesQuery.refetch();
      groupingValuesQuery.refetch();
    },
  };
};
