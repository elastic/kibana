/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useQuery } from '@kbn/react-query';
import { buildEpisodeEventsEsqlQuery, type EpisodeEventRow } from '../queries/episode_events_query';
import { esqlResponseToObjectRows } from '../utils/esql_response_to_rows';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { queryKeys } from '../query_keys';

export interface UseFetchEpisodeEventsQueryOptions {
  episodeId: string | undefined;
  data: DataPublicPluginStart;
}

/**
 * Loads all `.rule-events` rows for an episode (sorted ascending by @timestamp).
 */
export const useFetchEpisodeEventsQuery = ({
  episodeId,
  data,
}: UseFetchEpisodeEventsQueryOptions) => {
  return useQuery({
    queryKey: queryKeys.episodeEvents(episodeId ?? ''),
    queryFn: ({ signal }) =>
      runEsqlAsyncSearch({
        data,
        params: {
          query: buildEpisodeEventsEsqlQuery(episodeId!).print('basic'),
          time_zone: 'UTC',
        },
        abortSignal: signal,
      }),
    select: (raw) => esqlResponseToObjectRows<EpisodeEventRow>(raw),
    enabled: Boolean(episodeId),
  });
};
