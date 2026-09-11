/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { HttpStart } from '@kbn/core-http-browser';
import type { TimeRange } from '@kbn/es-query';
import { normalizeTags } from '@kbn/alerting-v2-utils';
import type { EpisodesFilterState, EpisodesSortState } from '@kbn/alerting-v2-common-queries';
import type { AlertEpisode } from '../queries/episodes_query';
import { queryKeys } from '../query_keys';
import { useAdditionalEpisodesDataSource } from '../context/episode_data_source_context';
import { useSpaceId } from './use_space_id';
import type { UseAlertingEpisodesDataViewOptions } from './use_alerting_episodes_data_view';
import { useAlertingEpisodesDataView } from './use_alerting_episodes_data_view';
import { fetchAlertingEpisodes } from '../apis/fetch_alerting_episodes';
import { mergeEpisodes } from '../utils/merge_episodes';
import { fetchFromSource, type EpisodeSourceError } from '../utils/fetch_from_sources';

interface CombinedEpisodesResult {
  episodes: AlertEpisode[];
  sourceErrors: EpisodeSourceError[];
}

export interface UseFetchAlertingEpisodesQueryOptions {
  pageSize: number;
  filterState?: EpisodesFilterState;
  sortState?: EpisodesSortState;
  timeRange?: TimeRange | null;
  services: UseAlertingEpisodesDataViewOptions['services'] & {
    expressions: ExpressionsStart;
    http: HttpStart;
  };
}

const DEFAULT_SORT: EpisodesSortState = { sortField: '@timestamp', sortDirection: 'desc' };

/**
 * Hook to fetch alerting episodes data with filters and sort.
 * Returns an ad-hoc data view too, constructed from the query columns.
 */
export const useFetchAlertingEpisodesQuery = ({
  pageSize,
  services,
  filterState,
  sortState = DEFAULT_SORT,
  timeRange,
}: UseFetchAlertingEpisodesQueryOptions) => {
  const additionalEpisodesDataSource = useAdditionalEpisodesDataSource();
  const spaceId = useSpaceId(services.spaces);
  const dataView = useAlertingEpisodesDataView({ services });

  const queryKey = queryKeys.list(
    spaceId,
    pageSize,
    filterState,
    sortState,
    timeRange ?? undefined,
    additionalEpisodesDataSource?.id
  );

  const query = useQuery<CombinedEpisodesResult>({
    enabled: dataView != null,
    queryKey,
    queryFn: async ({ signal: abortSignal }) => {
      const [v2Rows, sourceEpisodes] = await Promise.all([
        fetchAlertingEpisodes({
          spaceId,
          abortSignal,
          pageSize,
          services,
          filterState,
          sortState,
          timeRange,
        }),
        fetchFromSource(additionalEpisodesDataSource, (source) =>
          source.fetchEpisodes({
            services,
            abortSignal,
            pageSize,
            filterState,
            sortState,
            timeRange,
          })
        ),
      ]);

      const v2Episodes: AlertEpisode[] = v2Rows.map((ep) => ({
        ...ep,
        last_tags: normalizeTags(ep.last_tags),
      }));

      return {
        episodes: mergeEpisodes([v2Episodes, ...sourceEpisodes.results], sortState, pageSize),
        sourceErrors: sourceEpisodes.errors,
      };
    },
    keepPreviousData: true,
  });

  return {
    ...query,
    data: query.data?.episodes,
    sourceErrors: query.data?.sourceErrors ?? [],
    dataView,
  };
};
