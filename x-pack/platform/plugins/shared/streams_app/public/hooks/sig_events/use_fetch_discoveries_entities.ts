/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import type { Discovery } from '@kbn/streams-schema';
import { useKibana } from '../use_kibana';
import { useFetchErrorToast } from '../use_fetch_error_toast';

interface PaginatedDiscoveriesResponse {
  hits: Discovery[];
  page: number;
  perPage: number;
  total: number;
}

interface UseFetchDiscoveriesParams {
  from: string | number;
  to: string | number;
}

export const useFetchDiscoveriesEntities = ({ from, to }: UseFetchDiscoveriesParams) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const showFetchErrorToast = useFetchErrorToast();

  const [pagination, setPagination] = useState({ page: 1, perPage: 25 });

  const fetchDiscoveries = useCallback(
    async ({ signal }: QueryFunctionContext): Promise<PaginatedDiscoveriesResponse> => {
      return streamsRepositoryClient.fetch('GET /internal/sig_events/discoveries', {
        params: {
          query: {
            page: pagination.page,
            perPage: pagination.perPage,
            from: new Date(from).toISOString(),
            to: new Date(to).toISOString(),
          },
        },
        signal: signal ?? null,
      });
    },
    [streamsRepositoryClient, pagination, from, to]
  );

  const query = useQuery<PaginatedDiscoveriesResponse, Error>({
    queryKey: ['discoveriesEntities', pagination.page, pagination.perPage, from, to],
    queryFn: fetchDiscoveries,
    onError: showFetchErrorToast,
  });

  return { ...query, pagination, setPagination };
};

export const useFetchDiscoveryHistory = (discoveryId: string | undefined) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const showFetchErrorToast = useFetchErrorToast();

  return useQuery<{ hits: Discovery[] }, Error>({
    queryKey: ['discoveryHistory', discoveryId],
    queryFn: async ({ signal }) => {
      return streamsRepositoryClient.fetch('GET /internal/sig_events/discoveries/{id}/history', {
        params: { path: { id: discoveryId! } },
        signal: signal ?? null,
      });
    },
    enabled: !!discoveryId,
    onError: showFetchErrorToast,
  });
};
