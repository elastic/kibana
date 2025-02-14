/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
  useQuery,
} from '@tanstack/react-query';
import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND,
} from '@kbn/elastic-assistant-common';
import { InfiniteData } from '@tanstack/query-core/src/types';
import { useEffect } from 'react';
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
  page?: number;
  perPage?: number;
  signal?: AbortSignal | undefined;
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
export const useFetchCurrentUserConversationsByFilter = ({
  http,
  fields = query.fields,
  page = query.page,
  perPage = query.perPage,
  signal,
  refetchOnWindowFocus = true,
  isAssistantEnabled,
  setTotalItemCount,
}: UseFetchCurrentUserConversationsParams): FetchCurrentUserConversations => {
  const queryFn = async ({ pageParam }: { pageParam?: UseFetchCurrentUserConversationsParams }) => {
    return http.fetch<FetchConversationsResponse>(ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND, {
      method: 'GET',
      version: API_VERSIONS.public.v1,
      query: {
        fields,
        page: pageParam?.page ?? page,
        per_page: pageParam?.perPage ?? perPage,
      },
      signal,
    });
  };

  const getNextPageParam = (lastPage: FetchConversationsResponse) => {
    const totalPages = Math.max(1, Math.ceil(lastPage.total / lastPage.perPage));
    if (totalPages === lastPage.page) {
      return;
    }
    return {
      ...lastPage,
      page: lastPage.page + 1,
    };
  };

  const { data, isFetched, isFetching, isLoading, refetch } = useQuery(
    [ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND, page, perPage, API_VERSIONS.public.v1],
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

  const formatted = formatFetchedData(data);

  return {
    data: formatted ?? {},
    isLoading,
    refetch,
    isFetched,
    isFetching,
  };
};
