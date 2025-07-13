/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import {
  ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND,
  API_VERSIONS,
  FindAnonymizationFieldsResponse,
} from '@kbn/elastic-assistant-common';
import { useAssistantContext } from '../../../assistant_context';

export interface UseFetchAnonymizationFieldsParams {
  page?: number; // API uses 1-based index
  perPage?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  signal?: AbortSignal;
  filter?: string;
  all?: boolean; // If true, fetch all anonymization fields additionally, otherwise fetch only the provided page
}

export interface FetchAnonymizationFields {
  refetch: () => void;
  data: FindAnonymizationFieldsResponse;
  isFetched: boolean;
  isFetching: boolean;
  isError: boolean;
  isLoading: boolean;
}

export const QUERY_ALL = {
  page: 0,
  perPage: 1000,
};

export const DEFAULTS = {
  ...QUERY_ALL,
  sortField: 'field',
  sortOrder: 'asc',
};

const getFilter = (f: string): string | null => {
  if (!f || f.length === 0) {
    return null;
  }
  return f
    .split(' ')
    .map((word) => {
      if (word === 'is:allowed') {
        return 'allowed: true';
      } else if (word === 'is:anonymized') {
        return 'anonymized: true';
      } else {
        return `field: ${word}*`;
      }
    })
    .join(' AND ');
};

/**
 * API call for fetching anonymization fields for current spaceId
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {AbortSignal} [options.signal] - AbortSignal
 *
 * @returns {useInfiniteQuery} hook for getting the status of the anonymization fields
 */

export const useFetchAnonymizationFields = (
  params?: UseFetchAnonymizationFieldsParams
): FetchAnonymizationFields => {
  const {
    all,
    page = DEFAULTS.page,
    perPage = DEFAULTS.perPage,
    sortField = DEFAULTS.sortField,
    sortOrder = DEFAULTS.sortOrder,
    signal,
    filter,
  } = params || {};

  const {
    http,
    assistantAvailability: { isAssistantEnabled },
  } = useAssistantContext();

  const fetchPage = useCallback(
    async ({ pageParam = { page, perPage, sortField, sortOrder, filter, all } }) => {
      const {
        page: p = page,
        perPage: pp = perPage,
        sortField: sf = sortField,
        sortOrder: so = sortOrder,
        filter: f = '',
        all: isAll,
      } = pageParam;
      const queryFilter = getFilter(f);

      return http.fetch<FindAnonymizationFieldsResponse>(
        ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND,
        {
          method: 'GET',
          version: API_VERSIONS.public.v1,
          query: {
            page: p + 1, // EUI uses 0-based index, while API uses 1-based index
            per_page: pp,
            sort_field: sf,
            sort_order: so,
            ...(queryFilter ? { filter: queryFilter } : {}),
            all_data: isAll,
          },
          signal,
        }
      );
    },
    [page, perPage, sortField, sortOrder, filter, all, http, signal]
  );

  // Next page param: include current sorting in next request
  const getNextPageParam = useCallback(
    (lastPage: FindAnonymizationFieldsResponse) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.perPage);
      if (lastPage.page < totalPages) {
        return {
          page: lastPage.page + 1,
          sortField,
          sortOrder,
        };
      }
      return undefined;
    },
    [sortField, sortOrder]
  );

  const CACHING_KEYS = [
    sortField,
    sortOrder,
    perPage,
    API_VERSIONS.public.v1,
    ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND,
    page,
    filter,
    all,
  ];

  const { refetch, data, isFetched, isFetching, isError, isLoading } = useInfiniteQuery<
    FindAnonymizationFieldsResponse,
    unknown,
    FindAnonymizationFieldsResponse
  >(CACHING_KEYS, fetchPage, {
    getNextPageParam,
    enabled: isAssistantEnabled,
    refetchOnWindowFocus: true,
  });

  const currentPageItems: FindAnonymizationFieldsResponse = useMemo(() => {
    return (
      data?.pages.at(-1) ?? {
        page,
        perPage,
        total: 0,
        data: [],
        aggregations: {},
        ...(all ? { all: [] } : {}),
      }
    );
  }, [data, page, perPage, all]);

  return {
    refetch,
    data: currentPageItems,
    isFetched,
    isFetching,
    isError,
    isLoading,
  };
};
