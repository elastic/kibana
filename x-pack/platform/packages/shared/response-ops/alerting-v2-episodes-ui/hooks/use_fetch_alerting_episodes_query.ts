/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfiniteData } from '@kbn/react-query';
import { useInfiniteQuery, useQueryClient } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { ALERTING_EPISODES_COUNT_QUERY } from '../constants';
import { queryKeys } from '../query_keys';
import type { UseAlertingEpisodesDataViewOptions } from './use_alerting_episodes_data_view';
import { useAlertingEpisodesDataView } from './use_alerting_episodes_data_view';
import { fetchAlertingEpisodes } from '../apis/fetch_alerting_episodes';
import { executeEsqlQuery } from '../utils/execute_esql_query';

export interface UseFetchAlertingEpisodesQueryOptions {
  pageSize: number;
  services: UseAlertingEpisodesDataViewOptions['services'] & {
    expressions: ExpressionsStart;
  };
}

/**
 * Hook to fetch alerting episodes data with pagination.
 * Returns an ad-hoc data view too, constructed from the query columns.
 */
export const useFetchAlertingEpisodesQuery = ({
  pageSize,
  services,
}: UseFetchAlertingEpisodesQueryOptions) => {
  const dataView = useAlertingEpisodesDataView({ services });
  const queryClient = useQueryClient();

  const queryKey = queryKeys.list(pageSize);
  const query = useInfiniteQuery({
    enabled: dataView != null,
    queryKey,
    queryFn: async ({ signal: abortSignal, pageParam: beforeTimestamp }) => {
      // ES|QL doesn't return the total count of aggregated results, so we have to fetch it
      // in a separate query. We fetch it only once on the first page to keep a consistent
      // count across pagination, as the count can change between page fetches.
      const lastData =
        queryClient.getQueryData<InfiniteData<{ rows: any[]; total: number }>>(queryKey);
      let totalEpisodesCount = lastData?.pages[lastData?.pages.length - 1]?.total;
      if (totalEpisodesCount == null) {
        const episodesCountResult = await executeEsqlQuery({
          expressions: services.expressions,
          query: ALERTING_EPISODES_COUNT_QUERY,
          input: null,
          abortSignal,
        });
        totalEpisodesCount = episodesCountResult.rows[0]?.total ?? 0;
      }
      if (!totalEpisodesCount) {
        return { type: 'datatable' as const, columns: [], rows: [], total: 0 };
      }
      const episodes = await fetchAlertingEpisodes({
        abortSignal,
        pageSize,
        beforeTimestamp,
        services,
      });
      return { ...episodes, total: totalEpisodesCount };
    },
    getNextPageParam: (lastPage, allPages) => {
      return allPages.reduce((acc, page) => acc + page.rows.length, 0) < lastPage.total
        ? lastPage.rows[lastPage.rows.length - 1]['@timestamp']
        : undefined;
    },
    keepPreviousData: true,
  });

  return { ...query, dataView };
};
