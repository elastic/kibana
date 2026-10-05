/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { TimeRange } from '@kbn/es-query';
import { normalizeTags } from '@kbn/alerting-v2-utils';
import type { EpisodesFilterState, EpisodesSortState } from '@kbn/alerting-v2-common-queries';
import type { AlertEpisode } from '../queries/episodes_query';
import { queryKeys } from '../query_keys';
import {
  useAdditionalEpisodesDataSource,
  useQueryV2Source,
} from '../context/episode_data_source_context';
import { useSpaceId } from './use_space_id';
import type { UseAlertingEpisodesDataViewOptions } from './use_alerting_episodes_data_view';
import { useAlertingEpisodesDataView } from './use_alerting_episodes_data_view';
import { fetchAlertingEpisodes } from '../apis/fetch_alerting_episodes';
import { mergeEpisodes } from '../utils/merge_episodes';
import {
  EMPTY_SOURCE_ERRORS,
  fetchFromV2AndSource,
  type EpisodeSourceError,
} from '../utils/fetch_from_sources';
import { useToastSourceErrors } from './use_toast_source_errors';
import {
  buildSeverityRegistry,
  toSeverityRegistryMap,
  createSeverityRankResolver,
} from '../components/severity/severity_registry';

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
    notifications?: NotificationsStart;
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
  const queryV2Source = useQueryV2Source();
  const spaceId = useSpaceId(services.spaces);
  const dataView = useAlertingEpisodesDataView({ services });

  const severityRankResolver = useMemo(() => {
    const entries = buildSeverityRegistry(additionalEpisodesDataSource?.severityExtensions);
    return createSeverityRankResolver(toSeverityRegistryMap(entries));
  }, [additionalEpisodesDataSource?.severityExtensions]);

  const queryKey = queryKeys.list(
    spaceId,
    pageSize,
    filterState,
    sortState,
    timeRange ?? undefined,
    additionalEpisodesDataSource?.id,
    queryV2Source
  );

  const query = useQuery<CombinedEpisodesResult>({
    enabled: dataView != null,
    queryKey,
    queryFn: async ({ signal: abortSignal }) => {
      const { v2, additional, errors } = await fetchFromV2AndSource({
        v2: () =>
          fetchAlertingEpisodes({
            spaceId,
            abortSignal,
            pageSize,
            services,
            filterState,
            sortState,
            timeRange,
          }),
        source: additionalEpisodesDataSource,
        fromSource: (source) =>
          source
            .fetchEpisodes({
              services,
              abortSignal,
              pageSize,
              filterState,
              sortState,
              timeRange,
            })
            .then((episodes) => episodes.map((episode) => ({ ...episode, source_id: source.id }))),
        queryV2Source,
      });

      const v2Episodes: AlertEpisode[] = (v2 ?? []).map((ep) => ({
        ...ep,
        last_tags: normalizeTags(ep.last_tags),
      }));

      return {
        episodes: mergeEpisodes(
          [v2Episodes, ...additional],
          sortState,
          pageSize,
          severityRankResolver
        ),
        sourceErrors: errors,
      };
    },
    keepPreviousData: true,
  });

  const sourceErrors = query.data?.sourceErrors ?? EMPTY_SOURCE_ERRORS;
  useToastSourceErrors(sourceErrors, services.notifications?.toasts, 'list');

  return {
    ...query,
    data: query.data?.episodes,
    sourceErrors,
    dataView,
  };
};
