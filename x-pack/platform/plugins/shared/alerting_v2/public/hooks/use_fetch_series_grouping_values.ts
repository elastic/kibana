/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useQuery } from '@kbn/react-query';
import { runDslSearch } from '../utils/run_dsl_search';
import {
  buildSeriesGroupingValuesQuery,
  parseSeriesGroupingValuesResponse,
  type SeriesGroupingValuesByHash,
} from '../queries/alert_series_activity/series_grouping_values_query';
import { ruleOverviewQueryKeys } from '../queries/alert_series_activity/query_keys';

export interface UseFetchSeriesGroupingValuesOptions {
  ruleId: string | undefined;
  /** Group hashes returned by the summary query. */
  groupHashes: readonly string[];
  /** Field names from `rule.grouping.fields`. */
  groupingFields: readonly string[];
  /** Visible window start (epoch ms). */
  gteMs: number;
  /** Visible window end (epoch ms). */
  lteMs: number;
  /** Set false to defer the request (e.g. while the summary query is still loading). */
  enabled?: boolean;
  data: DataPublicPluginStart;
}

const EMPTY_RESULT: SeriesGroupingValuesByHash = {};

/**
 * Fetches the projected grouping field values per `group_hash` for a rule, used
 * to render row labels like `host=web-01` in the series activity heatmap.
 *
 * No request is issued when there are no grouping fields configured or no
 * group hashes to look up — both result in an empty map.
 */
export const useFetchSeriesGroupingValues = ({
  ruleId,
  groupHashes,
  groupingFields,
  gteMs,
  lteMs,
  enabled = true,
  data,
}: UseFetchSeriesGroupingValuesOptions) => {
  const isEnabled =
    enabled &&
    Boolean(ruleId) &&
    groupingFields.length > 0 &&
    groupHashes.length > 0 &&
    Number.isFinite(gteMs) &&
    Number.isFinite(lteMs) &&
    lteMs > gteMs;

  const query = useQuery({
    queryKey: ruleOverviewQueryKeys.seriesGroupingValues(
      ruleId ?? '',
      gteMs,
      lteMs,
      groupHashes,
      groupingFields
    ),
    enabled: isEnabled,
    queryFn: ({ signal }) =>
      runDslSearch({
        data,
        params: buildSeriesGroupingValuesQuery({
          ruleId: ruleId!,
          groupHashes: [...groupHashes],
          groupingFields,
          gteMs,
          lteMs,
        }),
        abortSignal: signal,
      }),
    select: (raw) => parseSeriesGroupingValuesResponse(raw, groupingFields),
  });

  return {
    data: query.data ?? EMPTY_RESULT,
    isLoading: query.isLoading && isEnabled,
    isError: query.isError,
    refetch: query.refetch,
  };
};
