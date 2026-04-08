/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { queryKeys } from '../query_keys';
import type { UseAlertingEpisodesDataViewOptions } from './use_alerting_episodes_data_view';
import { useAlertingEpisodesDataView } from './use_alerting_episodes_data_view';
import { useFetchDeactivatedGroupHashes } from './use_fetch_deactivated_group_hashes';
import { fetchAlertingEpisodes } from '../apis/fetch_alerting_episodes';
import { type EpisodesFilterState, type EpisodesSortState } from '../queries/episodes_query';

export interface UseFetchAlertingEpisodesQueryOptions {
  pageSize: number;
  filterState?: EpisodesFilterState;
  sortState?: EpisodesSortState;
  timeRange?: TimeRange | null;
  services: UseAlertingEpisodesDataViewOptions['services'] & {
    expressions: ExpressionsStart;
  };
}

const DEFAULT_SORT: EpisodesSortState = { sortField: '@timestamp', sortDirection: 'desc' };

/**
 * Hook to fetch alerting episodes data with filters and sort.
 * Returns an ad-hoc data view too, constructed from the query columns.
 *
 * When a status filter is active, pre-fetches deactivated (resolved) group hashes
 * so the status filter accounts for user-driven deactivation.
 */
export const useFetchAlertingEpisodesQuery = ({
  pageSize,
  services,
  filterState,
  sortState = DEFAULT_SORT,
  timeRange,
}: UseFetchAlertingEpisodesQueryOptions) => {
  const dataView = useAlertingEpisodesDataView({ services });

  const isStatusFilterActive = !!filterState?.status;

  const { data: deactivatedGroupHashes, isSuccess: isDeactivatedReady } =
    useFetchDeactivatedGroupHashes({
      enabled: isStatusFilterActive,
      services,
    });

  const enrichedFilterState: EpisodesFilterState | undefined = useMemo(() => {
    if (!filterState) return undefined;
    if (!isStatusFilterActive) return filterState;
    return { ...filterState, deactivatedGroupHashes: deactivatedGroupHashes ?? [] };
  }, [filterState, isStatusFilterActive, deactivatedGroupHashes]);

  const queryKey = queryKeys.list(
    pageSize,
    enrichedFilterState,
    sortState,
    timeRange ?? undefined,
    deactivatedGroupHashes
  );

  const query = useQuery({
    enabled: dataView != null && (!isStatusFilterActive || isDeactivatedReady),
    queryKey,
    queryFn: ({ signal: abortSignal }) =>
      fetchAlertingEpisodes({
        abortSignal,
        pageSize,
        services,
        filterState: enrichedFilterState,
        sortState,
        timeRange,
      }),
    keepPreviousData: true,
  });

  return { ...query, dataView };
};
