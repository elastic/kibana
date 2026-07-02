/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useQuery } from '@kbn/react-query';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import {
  buildEpisodeSeverityTransitionsEsqlQuery,
  type EpisodeSeverityTransitionRow,
} from '../queries/episode_severity_transitions_query';
import { QUERY_STALE_TIME } from '../constants';
import { esqlResponseToObjectRows } from '../utils/esql_response_to_rows';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { queryKeys } from '../query_keys';
import { useSpaceId } from './use_space_id';

export interface UseFetchEpisodeSeverityTransitionsQueryOptions {
  episodeId: string | undefined;
  services: { data: DataPublicPluginStart; spaces: SpacesPluginStart };
}

/**
 * Loads the minimal `.rule-events` severity series for an episode, sorted ascending
 * by @timestamp.
 */
export const useFetchEpisodeSeverityTransitionsQuery = ({
  episodeId,
  services,
}: UseFetchEpisodeSeverityTransitionsQueryOptions) => {
  const { data } = services;
  const spaceId = useSpaceId(services.spaces);

  return useQuery({
    queryKey: queryKeys.episodeSeverityTransitions(spaceId, episodeId ?? ''),
    queryFn: ({ signal }) =>
      runEsqlAsyncSearch({
        data,
        params: {
          query: buildEpisodeSeverityTransitionsEsqlQuery(spaceId, episodeId!).print('basic'),
          time_zone: 'UTC',
        },
        abortSignal: signal,
      }),
    select: (raw) => esqlResponseToObjectRows<EpisodeSeverityTransitionRow>(raw),
    enabled: Boolean(episodeId),
    staleTime: QUERY_STALE_TIME,
  });
};
