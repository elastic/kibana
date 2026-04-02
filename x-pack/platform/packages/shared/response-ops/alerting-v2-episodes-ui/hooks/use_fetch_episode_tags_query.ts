/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useQuery } from '@kbn/react-query';
import { buildEpisodeTagsEsqlQuery } from '../queries/episode_tags_query';
import { esqlResponseToObjectRows } from '../utils/esql_response_to_rows';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { queryKeys } from '../query_keys';

export interface UseFetchEpisodeTagsQueryOptions {
  episodeId: string | undefined;
  data: DataPublicPluginStart;
}

/**
 * Loads the latest `.alert-actions` row for an episode (expects a `tags` field).
 */
export const useFetchEpisodeTagsQuery = ({ episodeId, data }: UseFetchEpisodeTagsQueryOptions) => {
  return useQuery({
    queryKey: queryKeys.episodeTags(episodeId ?? ''),
    queryFn: async ({ signal }) => {
      const raw = await runEsqlAsyncSearch({
        data,
        params: {
          query: buildEpisodeTagsEsqlQuery(episodeId as string).print('basic'),
          time_zone: 'UTC',
        },
        abortSignal: signal,
      });
      return esqlResponseToObjectRows(raw)[0];
    },
    enabled: Boolean(episodeId),
  });
};
