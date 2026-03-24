/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfiniteData } from '@kbn/react-query';
import { useInfiniteQuery, useQueryClient } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { ExpressionValueSearchContext } from '@kbn/data-plugin/common';
import { queryKeys } from '../query_keys';
import type { UseAlertingEpisodesDataViewOptions } from './use_alerting_episodes_data_view';
import { useAlertingEpisodesDataView } from './use_alerting_episodes_data_view';
import { fetchAlertingEpisodes } from '../apis/fetch_alerting_episodes';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import {
  buildEpisodesCountQuery,
  type EpisodesFilterState,
  type EpisodesSortState,
} from '../utils/build_episodes_esql_query';
import { buildEpisodesFilters } from '../utils/build_episodes_filters';

export interface UseFetchAlertingEpisodesQueryOptions {
  pageSize: number;
  services: UseAlertingEpisodesDataViewOptions['services'] & {
    expressions: ExpressionsStart;
  };
  filterState?: EpisodesFilterState;
  sortState?: EpisodesSortState;
  timeRange?: TimeRange | null;
}

const DEFAULT_SORT: EpisodesSortState = { sortField: '@timestamp', sortDirection: 'desc' };

/**
 * Hook to fetch alerting episodes data with pagination, filters, and sort.
 * Returns an ad-hoc data view too, constructed from the query columns.
 */
export const useFetchAlertingEpisodesQuery = ({
  pageSize,
  services,
  filterState,
  sortState = DEFAULT_SORT,
  timeRange,
}: UseFetchAlertingEpisodesQueryOptions) => {
  const dataView = useAlertingEpisodesDataView({ services });
  const queryClient = useQueryClient();

  const queryKey = queryKeys.list(pageSize, filterState, sortState, timeRange ?? undefined);
  const query = useInfiniteQuery({
    enabled: dataView != null,
    queryKey,
    queryFn: async ({ signal: abortSignal, pageParam: beforeTimestamp }) => {
      if (!dataView) {
        return { type: 'datatable' as const, columns: [], rows: [], total: 0 };
      }

      const lastData =
        queryClient.getQueryData<InfiniteData<{ rows: any[]; total: number }>>(queryKey);
      let totalEpisodesCount = lastData?.pages[lastData?.pages.length - 1]?.total;
      if (totalEpisodesCount == null) {
        const countQuery = buildEpisodesCountQuery().print('basic');
        const filters = buildEpisodesFilters(filterState, dataView);
        const countInput: ExpressionValueSearchContext = {
          type: 'kibana_context' as const,
        };
        if (timeRange) {
          countInput.timeRange = timeRange;
        }
        if (filters.length > 0) {
          countInput.filters = filters;
        }
        const episodesCountResult = await executeEsqlQuery({
          expressions: services.expressions,
          query: countQuery,
          input: countInput,
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
        filterState,
        sortState,
        timeRange,
        dataView,
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
