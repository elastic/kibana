/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import type { QueriesGetResponse } from '@kbn/streams-schema';
import type { QueryStatus } from '@kbn/streams-plugin/common';
import { useKibana } from './use_kibana';
import { useFetchErrorToast } from './use_fetch_error_toast';

export const DISCOVERY_QUERIES_QUERY_KEY = ['discoveryQueries'] as const;

export const useFetchDiscoveryQueries = (
  options: {
    name?: string;
    query?: string;
    page?: number;
    perPage?: number;
    status?: QueryStatus[];
  } = {},
  deps: unknown[] = []
) => {
  const { name, query, page = 1, perPage = 10, status } = options;
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const showFetchErrorToast = useFetchErrorToast();

  const fetchDiscoveryQueries = async ({
    signal,
  }: QueryFunctionContext): Promise<QueriesGetResponse | undefined> => {
    return await streamsRepositoryClient.fetch('GET /internal/streams/_queries', {
      params: {
        query: {
          search: query?.trim() ?? '',
          streamName: name ? [name] : undefined,
          page,
          perPage,
          status,
        },
      },
      signal: signal ?? null,
    });
  };

  return useQuery<QueriesGetResponse | undefined, Error>({
    queryKey: [...DISCOVERY_QUERIES_QUERY_KEY, name, query, page, perPage, status, ...deps],
    queryFn: fetchDiscoveryQueries,
    onError: showFetchErrorToast,
    keepPreviousData: true,
  });
};
