/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useInfiniteQuery } from '@kbn/react-query';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import {
  buildEpisodeActionsHistoryQuery,
  DEFAULT_ACTIONS_HISTORY_PAGE_SIZE,
  type EpisodeActionHistoryEntry,
} from '../queries/episode_actions_history_query';
import { esqlResponseToObjectRows } from '../utils/esql_response_to_rows';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { queryKeys } from '../query_keys';
import { useSpaceId } from './use_space_id';

export interface UseFetchEpisodeActionsHistoryQueryOptions {
  episodeId: string | undefined;
  groupHash: string | undefined;
  services: { data: DataPublicPluginStart; spaces: SpacesPluginStart };
  /** Page size for each keyset fetch. Defaults to {@link DEFAULT_ACTIONS_HISTORY_PAGE_SIZE}. */
  pageSize?: number;
}

/**
 * Loads an episode's action history newest-first, one keyset page at a time. Pages are cursored
 * by the oldest `@timestamp` of the previous page (`WHERE @timestamp <= cursor`), so records that
 * land exactly on the boundary can be re-fetched — they're deduped here by `_id`.
 */
export const useFetchEpisodeActionsHistoryQuery = ({
  episodeId,
  groupHash,
  services,
  pageSize = DEFAULT_ACTIONS_HISTORY_PAGE_SIZE,
}: UseFetchEpisodeActionsHistoryQueryOptions) => {
  const { data } = services;
  const spaceId = useSpaceId(services.spaces);

  const query = useInfiniteQuery({
    queryKey: [...queryKeys.actionsHistory(spaceId, episodeId ?? '', groupHash ?? ''), pageSize],
    queryFn: async ({ signal, pageParam }: { signal?: AbortSignal; pageParam?: string }) => {
      const raw = await runEsqlAsyncSearch({
        data,
        params: {
          query: buildEpisodeActionsHistoryQuery(spaceId, episodeId!, groupHash!, {
            before: pageParam,
            limit: pageSize,
          }).print('basic'),
          time_zone: 'UTC',
        },
        abortSignal: signal,
      });
      return esqlResponseToObjectRows<EpisodeActionHistoryEntry>(raw);
    },
    getNextPageParam: (lastPage: EpisodeActionHistoryEntry[]) =>
      lastPage.length === pageSize ? lastPage[lastPage.length - 1]['@timestamp'] : undefined,
    enabled: Boolean(episodeId) && Boolean(groupHash),
  });

  const entries = useMemo(() => {
    const seen = new Set<string>();
    const deduped: EpisodeActionHistoryEntry[] = [];
    for (const entry of query.data?.pages.flat() ?? []) {
      if (seen.has(entry._id)) continue;
      seen.add(entry._id);
      deduped.push(entry);
    }
    return deduped;
  }, [query.data]);

  return {
    entries,
    // isLoading stays true forever for a disabled query in React Query v4 (e.g. no groupHash
    // yet); isInitialLoading is false in that case, only true while actually fetching.
    isLoading: query.isInitialLoading,
    isError: query.isError,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
  };
};
