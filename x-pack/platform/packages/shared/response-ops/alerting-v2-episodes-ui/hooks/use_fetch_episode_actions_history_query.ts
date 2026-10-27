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
import { normalizeTags } from '@kbn/alerting-v2-utils';
import {
  rowsFromEsql,
  toEpisodeActionActor,
  type EpisodeActionHistoryEntry,
} from '@kbn/alerting-v2-common-queries';
import {
  buildEpisodeActionsHistoryQuery,
  DEFAULT_ACTIONS_HISTORY_PAGE_SIZE,
} from '../queries/episode_actions_history_query';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { queryKeys } from '../query_keys';
import { useSpaceId } from './use_space_id';

export interface UseFetchEpisodeActionsHistoryQueryOptions {
  episodeId: string | undefined;
  /**
   * Series of the episode. `undefined` while it is still being resolved (nothing is fetched yet),
   * `null` when the episode has no series identity (only its own actions are fetched).
   */
  seriesId: string | null | undefined;
  /**
   * `group_hash` of the episode. It narrows the series-level actions on an indexed field before
   * the series id is compared, so nothing is fetched while it is `undefined` and `seriesId` is a
   * string.
   */
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
  seriesId,
  groupHash,
  services,
  pageSize = DEFAULT_ACTIONS_HISTORY_PAGE_SIZE,
}: UseFetchEpisodeActionsHistoryQueryOptions) => {
  const { data } = services;
  const spaceId = useSpaceId(services.spaces);
  // `null` means the episode has no series, so its own actions are all there is to fetch. A
  // series needs its group hash as well, or the series-level actions would silently be skipped.
  const isSeriesResolved = seriesId === null || (seriesId !== undefined && groupHash !== undefined);

  const query = useInfiniteQuery({
    queryKey: [...queryKeys.actionsHistory(spaceId, episodeId ?? '', seriesId ?? ''), pageSize],
    queryFn: async ({ signal, pageParam }: { signal?: AbortSignal; pageParam?: string }) => {
      const series = seriesId && groupHash ? { seriesId, groupHash } : null;
      const esqlQuery = buildEpisodeActionsHistoryQuery(spaceId, episodeId!, series, {
        before: pageParam,
        limit: pageSize,
      });
      const raw = await runEsqlAsyncSearch({
        data,
        params: {
          query: esqlQuery.print('basic'),
          time_zone: 'UTC',
        },
        abortSignal: signal,
      });
      return rowsFromEsql(esqlQuery, raw);
    },
    getNextPageParam: (lastPage) =>
      lastPage.length === pageSize ? lastPage[lastPage.length - 1]['@timestamp'] : undefined,
    enabled: Boolean(episodeId) && isSeriesResolved,
  });

  const entries = useMemo(() => {
    const seen = new Set<string>();
    const deduped: EpisodeActionHistoryEntry[] = [];
    for (const row of query.data?.pages.flat() ?? []) {
      if (seen.has(row._id)) continue;
      seen.add(row._id);
      const { 'actor.type': actorType, 'actor.profile_uid': actorProfileUid, tags, ...rest } = row;
      deduped.push({
        ...rest,
        actor: toEpisodeActionActor({
          'actor.type': actorType,
          'actor.profile_uid': actorProfileUid,
        }),
        tags: normalizeTags(tags),
      });
    }
    return deduped;
  }, [query.data]);

  return {
    entries,
    // isLoading stays true forever for a disabled query in React Query v4 (e.g. no seriesId
    // yet); isInitialLoading is false in that case, only true while actually fetching.
    isLoading: query.isInitialLoading,
    isError: query.isError,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
  };
};
