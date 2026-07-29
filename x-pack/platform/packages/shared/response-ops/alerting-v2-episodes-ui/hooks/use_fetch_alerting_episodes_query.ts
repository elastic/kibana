/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { TimeRange } from '@kbn/es-query';
import type { HttpStart } from '@kbn/core-http-browser';
import { queryKeys } from '../query_keys';
import { useSpaceId } from './use_space_id';
import type { UseAlertingEpisodesDataViewOptions } from './use_alerting_episodes_data_view';
import { useAlertingEpisodesDataView } from './use_alerting_episodes_data_view';
import { fetchUnifiedAlertingEpisodes } from '../apis/fetch_unified_alerting_episodes';
import {
  type AlertEpisode,
  type AlertEpisodeEsqlRow,
  type EpisodesFilterState,
  type EpisodesSortState,
} from '../queries/episodes_query';
import { normalizeTags } from '../utils/normalize_tags';

export interface UseFetchAlertingEpisodesQueryOptions {
  pageSize: number;
  filterState?: EpisodesFilterState;
  sortState?: EpisodesSortState;
  timeRange?: TimeRange | null;
  services: UseAlertingEpisodesDataViewOptions['services'] & {
    http: HttpStart;
  };
}

const DEFAULT_SORT: EpisodesSortState = { sortField: '@timestamp', sortDirection: 'desc' };

/**
 * Hook to fetch alerting episodes (v2 + classic) with filters and sort via the
 * unified server list API. Returns an ad-hoc data view constructed from the
 * query columns.
 */
export const useFetchAlertingEpisodesQuery = ({
  pageSize,
  services,
  filterState,
  sortState = DEFAULT_SORT,
  timeRange,
}: UseFetchAlertingEpisodesQueryOptions) => {
  const spaceId = useSpaceId(services.spaces);
  const dataView = useAlertingEpisodesDataView({ services });

  const queryKey = queryKeys.list(
    spaceId,
    pageSize,
    filterState,
    sortState,
    timeRange ?? undefined
  );

  const query = useQuery<AlertEpisodeEsqlRow[], unknown, AlertEpisode[]>({
    enabled: dataView != null,
    queryKey,
    queryFn: ({ signal: abortSignal }) =>
      fetchUnifiedAlertingEpisodes({
        abortSignal,
        pageSize,
        services,
        filterState,
        sortState,
        timeRange,
      }),
    keepPreviousData: true,
    select: (rows): AlertEpisode[] =>
      rows.map((ep) => ({
        ...ep,
        last_tags: normalizeTags(ep.last_tags),
      })),
  });

  return { ...query, dataView };
};
