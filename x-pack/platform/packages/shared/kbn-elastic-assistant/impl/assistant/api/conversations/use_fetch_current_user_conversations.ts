/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import {
  InfiniteData,
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
  useInfiniteQuery,
} from '@tanstack/react-query';
import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND,
} from '@kbn/elastic-assistant-common';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Conversation } from '../../../assistant_context/types';

export interface FetchConversationsResponse {
  page: number;
  perPage: number;
  total: number;
  data: Conversation[];
}

export interface UseFetchCurrentUserConversationsParams {
  http: HttpSetup;
  fields?: string[];
  filter?: string;
  page?: number;
  perPage?: number;
  signal?: AbortSignal | undefined;
  sortField?: string;
  sortOrder?: string;
  refetchOnWindowFocus?: boolean;
  isAssistantEnabled: boolean;
  setTotalItemCount?: (total: number) => void;
}

export interface FetchCurrentUserConversations {
  data: Record<string, Conversation>;
  isLoading: boolean;
  refetch: <TPageData>(
    options?: RefetchOptions & RefetchQueryFilters<TPageData>
  ) => Promise<QueryObserverResult<InfiniteData<FetchConversationsResponse>, unknown>>;
  isFetched: boolean;
  isFetching: boolean;
  setPaginationObserver: (ref: HTMLDivElement) => void;
}

const query = {
  page: 1,
  perPage: 28,
  // keep request small returning a subset of fields
  // un-requested required fields like the users array will now appear empty
  // something to consider if/when we add support for global/shared conversations.
  fields: ['id', 'title', 'apiConfig', 'updatedAt'],
};

const formatFetchedData = (data: InfiniteData<FetchConversationsResponse> | undefined) =>
  data?.pages.reduce((acc, curr) => {
    return {
      ...acc,
      ...curr.data.reduce(
        (conversationsArr, conversation) => ({
          ...conversationsArr,
          [conversation.id]: conversation,
        }),
        {}
      ),
    };
  }, {});
/**
 * API call for fetching assistant conversations for the current user
 */
export const useFetchCurrentUserConversations = ({
  http,
  fields = query.fields,
  filter,
  page = query.page,
  perPage = query.perPage,
  signal,
  sortField = 'updated_at',
  sortOrder = 'desc',
  refetchOnWindowFocus = true,
  isAssistantEnabled,
  setTotalItemCount,
}: UseFetchCurrentUserConversationsParams): FetchCurrentUserConversations => {
  const queryFn = useCallback(
    async ({ pageParam }: { pageParam?: UseFetchCurrentUserConversationsParams }) => {
      return http.fetch<FetchConversationsResponse>(ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND, {
        method: 'GET',
        version: API_VERSIONS.public.v1,
        query: {
          fields,
          filter,
          page: pageParam?.page ?? page,
          per_page: pageParam?.perPage ?? perPage,
          sort_field: sortField,
          sort_order: sortOrder,
        },
        signal,
      });
    },
    [fields, filter, http, page, perPage, signal, sortField, sortOrder]
  );

  const getNextPageParam = useCallback((lastPage: FetchConversationsResponse) => {
    const totalPages = Math.max(1, Math.ceil(lastPage.total / lastPage.perPage));
    if (totalPages === lastPage.page) {
      return;
    }
    return {
      ...lastPage,
      page: lastPage.page + 1,
    };
  }, []);

  const { data, fetchNextPage, hasNextPage, isFetched, isFetching, isLoading, refetch } =
    useInfiniteQuery(
      [
        ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND,
        page,
        perPage,
        API_VERSIONS.public.v1,
        filter,
        sortField,
        sortOrder,
      ],
      queryFn,
      {
        enabled: isAssistantEnabled,
        getNextPageParam,
        refetchOnWindowFocus,
      }
    );
  useEffect(() => {
    if (setTotalItemCount && data?.pages?.length) {
      setTotalItemCount(data?.pages[0].total ?? 0);
    }
  }, [data?.pages, setTotalItemCount]);

  const formatted = useMemo(() => formatFetchedData(data), [data]);

  const observerRef = useRef<IntersectionObserver>();
  const fetchNext = useCallback(
    async ([{ isIntersecting }]: IntersectionObserverEntry[]) => {
      if (isIntersecting && hasNextPage && !isLoading && !isFetching) {
        await fetchNextPage();
        observerRef.current?.disconnect();
      }
    },
    [fetchNextPage, hasNextPage, isFetching, isLoading]
  );

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  // Attaches an intersection observer to the last element
  // to trigger a callback to paginate when the user scrolls to it
  const setPaginationObserver = useCallback(
    (ref: HTMLDivElement) => {
      observerRef.current?.disconnect();
      observerRef.current = new IntersectionObserver(fetchNext, {
        root: null,
        rootMargin: '0px',
        threshold: 0.1,
      });
      observerRef.current?.observe(ref);
    },
    [fetchNext]
  );

  return {
    data: formatted ?? {},
    isLoading,
    refetch,
    isFetched,
    isFetching,
    setPaginationObserver,
  };
};
