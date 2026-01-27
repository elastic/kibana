/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type {
  InfiniteData,
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
} from '@kbn/react-query';
import { useInfiniteQuery } from '@kbn/react-query';
import type { User } from '@kbn/elastic-assistant-common';
import {
  getIsConversationOwner,
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND,
} from '@kbn/elastic-assistant-common';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Conversation } from '../../../assistant_context/types';

export interface FetchConversationsResponse {
  page: number;
  perPage: number;
  total: number;
  data: Conversation[];
}

export interface UseFetchCurrentUserConversationsParams {
  currentUser?: User;
  http: HttpSetup;
  fields?: string[];
  filter?: string;
  page?: number;
  perPage?: number;
  signal?: AbortSignal | undefined;
  sortField?: string;
  sortOrder?: string;
  refetchOnWindowFocus?: boolean;
  isConversationOwner?: boolean;
  isAssistantEnabled: boolean;
  setTotalItemCount?: (total: number) => void;
}
export interface ConversationWithOwner extends Conversation {
  isConversationOwner: boolean;
}
export interface FetchCurrentUserConversations {
  data: Record<string, ConversationWithOwner>;
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
  currentUser,
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
  // if true, only return conversations where the current user is the owner
  isConversationOwner = false,
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
          is_owner: isConversationOwner,
        },
        signal,
      });
    },
    [fields, filter, http, isConversationOwner, page, perPage, signal, sortField, sortOrder]
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
        select: (searchResponse) => {
          return {
            ...searchResponse,
            pages: searchResponse.pages.map((p) => ({
              ...p,
              data: p.data.map((conversation) => ({
                ...conversation,
                isConversationOwner: isConversationOwner
                  ? true
                  : getIsConversationOwner(conversation, currentUser),
              })),
            })),
          };
        },
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
