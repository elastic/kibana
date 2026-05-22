/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import type { Detection } from '@kbn/streams-schema';
import { useKibana } from '../use_kibana';
import { useFetchErrorToast } from '../use_fetch_error_toast';

interface PaginatedDetectionsResponse {
  hits: Detection[];
  page: number;
  perPage: number;
  total: number;
}

interface UseFetchDetectionsParams {
  from: string | number;
  to: string | number;
}

export const useFetchDetections = ({ from, to }: UseFetchDetectionsParams) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const showFetchErrorToast = useFetchErrorToast();

  const [pagination, setPagination] = useState({ page: 1, perPage: 25 });

  const fetchDetections = useCallback(
    async ({ signal }: QueryFunctionContext): Promise<PaginatedDetectionsResponse> => {
      return streamsRepositoryClient.fetch('GET /internal/sig_events/detections', {
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

  const query = useQuery<PaginatedDetectionsResponse, Error>({
    queryKey: ['detections', pagination.page, pagination.perPage, from, to],
    queryFn: fetchDetections,
    onError: showFetchErrorToast,
  });

  return { ...query, pagination, setPagination };
};

export const useFetchDetectionHistory = (detectionId: string | undefined) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const showFetchErrorToast = useFetchErrorToast();

  return useQuery<{ hits: Detection[] }, Error>({
    queryKey: ['detectionHistory', detectionId],
    queryFn: async ({ signal }) => {
      return streamsRepositoryClient.fetch('GET /internal/sig_events/detections/{id}/history', {
        params: { path: { id: detectionId! } },
        signal: signal ?? null,
      });
    },
    enabled: !!detectionId,
    onError: showFetchErrorToast,
  });
};
