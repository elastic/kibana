/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useQuery } from '@kbn/react-query';
import { runEsqlAsyncSearch } from '@kbn/alerting-v2-episodes-ui/utils/run_esql_async_search';
import { esqlResponseToObjectRows } from '@kbn/alerting-v2-episodes-ui/utils/esql_response_to_rows';
import {
  buildSeriesGroupingValuesEsqlQuery,
  parseSeriesGroupingValuesRows,
  type SeriesGroupingValuesByHash,
  type SeriesGroupingValuesRow,
} from '../queries/alert_series_activity/series_grouping_values_query';
import { ruleOverviewQueryKeys } from '../queries/alert_series_activity/query_keys';

export interface UseFetchSeriesGroupingValuesOptions {
  ruleId: string | undefined;
  /** Group hashes returned by the summary query. */
  groupHashes: readonly string[];
  /**
   * Field names from the rule's `grouping.fields`. Used to gate the request and
   * to project the grouping values rendered next to each series.
   */
  groupingFields: readonly string[];
  /** Set false to defer the request (e.g. while the summary query is still loading). */
  enabled?: boolean;
  data: DataPublicPluginStart;
}

const EMPTY_RESULT: SeriesGroupingValuesByHash = {};

/**
 * Fetches the projected grouping field values per `group_hash` for a rule, used
 * to render row labels like `host=web-01` next to each gantt series.
 *
 * The lookup is untimed (grouping values are invariant per hash) and reads the
 * flattened `data` via ES|QL `_source` + `JSON_EXTRACT`, mirroring the episodes
 * list. No request is issued when there are no grouping fields configured or no
 * group hashes to look up — both result in an empty map.
 */
export const useFetchSeriesGroupingValues = ({
  ruleId,
  groupHashes,
  groupingFields,
  enabled = true,
  data,
}: UseFetchSeriesGroupingValuesOptions) => {
  const isEnabled =
    enabled && Boolean(ruleId) && groupingFields.length > 0 && groupHashes.length > 0;

  const query = useQuery({
    queryKey: ruleOverviewQueryKeys.seriesGroupingValues(ruleId ?? '', groupHashes, groupingFields),
    enabled: isEnabled,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      const raw = await runEsqlAsyncSearch({
        data,
        params: {
          query: buildSeriesGroupingValuesEsqlQuery({
            ruleId: ruleId!,
            groupHashes: [...groupHashes],
          }).print('basic'),
          time_zone: 'UTC',
        },
        abortSignal: signal,
      });
      return esqlResponseToObjectRows<SeriesGroupingValuesRow>(raw);
    },
    select: (rows) => parseSeriesGroupingValuesRows(rows, groupingFields),
  });

  return {
    data: query.data ?? EMPTY_RESULT,
    isLoading: query.isLoading && isEnabled,
    isError: query.isError,
    refetch: query.refetch,
  };
};
