/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { queryKeys } from '../query_keys';
import type { UseAlertingEpisodesDataViewOptions } from './use_alerting_episodes_data_view';
import { useAlertingEpisodesDataView } from './use_alerting_episodes_data_view';
import { fetchAlertingEpisodes } from '../apis/fetch_alerting_episodes';
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
    expressions: ExpressionsStart;
  };
}

const DEFAULT_SORT: EpisodesSortState = { sortField: '@timestamp', sortDirection: 'desc' };

/**
 * Hook to fetch alerting episodes data with filters and sort.
 * Returns an ad-hoc data view too, constructed from the query columns.
 *
 * Deactivation state is resolved server-side in the ESQL query via an
 * `effective_status` column, so no separate pre-fetch is needed.
 */
export const useFetchAlertingEpisodesQuery = ({
  pageSize,
  services,
  filterState,
  sortState = DEFAULT_SORT,
  timeRange,
}: UseFetchAlertingEpisodesQueryOptions) => {
  const dataView = useAlertingEpisodesDataView({ services });

  const queryKey = queryKeys.list(pageSize, filterState, sortState, timeRange ?? undefined);

  const query = useQuery<AlertEpisodeEsqlRow[], unknown, AlertEpisode[]>({
    enabled: dataView != null,
    queryKey,
    queryFn: ({ signal: abortSignal }) =>
      fetchAlertingEpisodes({
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
