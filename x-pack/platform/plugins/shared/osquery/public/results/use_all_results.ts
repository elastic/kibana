/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@kbn/react-query';

import { i18n } from '@kbn/i18n';
import { useKibana } from '../common/lib/kibana';
import type { ResultEdges, Direction, ResultsStrategyResponse } from '../../common/search_strategy';
import { API_VERSIONS } from '../../common/constants';

import { useErrorToast } from '../common/hooks/use_error_toast';

interface ResultsArgs {
  edges: ResultEdges;
  id: string;
  total: number;
  columns: string[];
  pitId?: string;
  searchAfter?: string;
  hasMore?: boolean;
}

/**
 * Response type with serialized pagination fields for HTTP transport.
 * SortResults arrays are JSON-stringified to safely pass through HTTP query params.
 */
interface SerializedResultsStrategyResponse
  extends Omit<ResultsStrategyResponse, 'searchAfter' | 'pitId' | 'hasMore'> {
  pitId?: string;
  searchAfter?: string;
  hasMore?: boolean;
}

interface UseAllResults {
  actionId: string;
  liveQueryActionId?: string;
  activePage: number;
  startDate?: string;
  limit: number;
  sort: Array<{ field: string; direction: Direction }>;
  kuery?: string;
  isLive?: boolean;
}

interface CursorState {
  pitId?: string;
  searchAfterByPage: Map<number, string>;
}

export const useAllResults = ({
  actionId,
  liveQueryActionId,
  activePage,
  startDate,
  limit,
  sort,
  kuery,
  isLive = false,
}: UseAllResults) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  const [cursorState, setCursorState] = useState<CursorState>({
    searchAfterByPage: new Map(),
  });

  // Track pages that have been successfully fetched (to avoid showing overlay on refetches)
  const [fetchedPages, setFetchedPages] = useState<Set<number>>(new Set());

  const prevDepsRef = useRef({ sort, kuery, startDate, actionId, limit });

  const closePit = useCallback(
    async (pitId: string) => {
      try {
        await http.post('/internal/osquery/live_queries/pit/close', {
          version: API_VERSIONS.internal.v1,
          body: JSON.stringify({ pitId }),
        });
      } catch {
        // Ignore errors when closing PIT
      }
    },
    [http]
  );

  useEffect(() => {
    const prev = prevDepsRef.current;
    const depsChanged =
      prev.actionId !== actionId ||
      prev.limit !== limit ||
      JSON.stringify(prev.sort) !== JSON.stringify(sort) ||
      prev.kuery !== kuery ||
      prev.startDate !== startDate;

    if (depsChanged) {
      // Close old PIT before resetting state to avoid resource leak
      setCursorState((prevState) => {
        if (prevState.pitId) {
          closePit(prevState.pitId);
        }

        return { searchAfterByPage: new Map() };
      });
      setFetchedPages(new Set());
      prevDepsRef.current = { sort, kuery, startDate, actionId, limit };
    }
  }, [sort, kuery, startDate, actionId, limit, closePit]);

  useEffect(() => {
    const currentPitId = cursorState.pitId;

    return () => {
      if (currentPitId) {
        closePit(currentPitId);
      }
    };
  }, [cursorState.pitId, closePit]);

  const searchAfter = useMemo(() => {
    if (activePage === 0) return undefined;

    return cursorState.searchAfterByPage.get(activePage - 1);
  }, [activePage, cursorState.searchAfterByPage]);

  const queryResult = useQuery<{ data: SerializedResultsStrategyResponse }, Error, ResultsArgs>(
    [
      'allActionResults',
      { actionId, liveQueryActionId, activePage, limit, sort, kuery, startDate },
    ],
    () =>
      http.get<{ data: SerializedResultsStrategyResponse }>(
        `/api/osquery/live_queries/${liveQueryActionId}/results/${actionId}`,
        {
          version: API_VERSIONS.public.v1,
          query: {
            page: activePage,
            pageSize: limit,
            ...(sort.length > 0 && {
              sort: sort[0].field,
              sortOrder: sort[0].direction,
            }),
            ...(kuery && { kuery }),
            ...(startDate && { startDate }),
            ...(cursorState.pitId && { pitId: cursorState.pitId }),
            ...(searchAfter && { searchAfter }),
          },
        }
      ),
    {
      select: (response) => ({
        id: actionId,
        total: response.data.total ?? 0,
        edges: response.data.edges ?? [],
        columns: Object.keys(
          (response.data.edges?.length && response.data.edges[0].fields) || {}
        ).sort(),
        pitId: response.data.pitId,
        searchAfter: response.data.searchAfter,
        hasMore: response.data.hasMore,
      }),
      keepPreviousData: true,
      refetchInterval: isLive ? 5000 : false,
      onSuccess: () => {
        setErrorToast();
      },
      onError: (error: Error) =>
        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.live_query_results.fetchError', {
            defaultMessage: 'Error while fetching live query results',
          }),
        }),
    }
  );

  useEffect(() => {
    const responseData = queryResult.data;
    // Only process when we have actual data for this page (not stale keepPreviousData)
    if (responseData && !queryResult.isPreviousData) {
      // Mark this page as fetched (to avoid showing overlay on refetches)
      setFetchedPages((prev) => {
        if (prev.has(activePage)) return prev;
        const newSet = new Set(prev);
        newSet.add(activePage);

        return newSet;
      });

      if (responseData.pitId || responseData.searchAfter) {
        setCursorState((prev) => {
          const newSearchAfterByPage = new Map(prev.searchAfterByPage);
          if (responseData.searchAfter) {
            newSearchAfterByPage.set(activePage, responseData.searchAfter);
          }

          return {
            pitId: responseData.pitId ?? prev.pitId,
            searchAfterByPage: newSearchAfterByPage,
          };
        });
      }
    }
  }, [queryResult.data, queryResult.isPreviousData, activePage]);

  // Show loading overlay only when:
  // 1. Fetching is in progress
  // 2. We're beyond the 10k document threshold (where ES can't use simple from/size)
  // 3. We don't have a cached cursor for this page
  // 4. This page hasn't been fetched before (avoid showing overlay on isLive refetches)
  const MAX_ES_FROM_SIZE = 10000;
  const isPageBeyond10k = activePage * limit >= MAX_ES_FROM_SIZE;
  const isFetchingWithoutCursor =
    queryResult.isFetching &&
    isPageBeyond10k &&
    searchAfter === undefined &&
    !fetchedPages.has(activePage);

  return {
    ...queryResult,
    isFetching: queryResult.isFetching,
    isFetchingWithoutCursor,
  };
};
