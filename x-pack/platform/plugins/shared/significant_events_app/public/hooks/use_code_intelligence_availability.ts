/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryFunctionContext } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { useKibana } from './use_kibana';

/**
 * Reports whether the externally installed Code Intelligence agent is available.
 * When it is not, the UI shows the setup placeholder instead of code-derived KIs.
 */
export const useCodeIntelligenceAvailability = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { significantEventsRepositoryClient } = useKibana().dependencies.start.significantEvents;

  const { data, error, isLoading, refetch } = useQuery<
    { available: boolean; message?: string },
    Error
  >({
    queryKey: ['code-intelligence-availability'],
    queryFn: async ({ signal }: QueryFunctionContext) =>
      significantEventsRepositoryClient.fetch(
        'GET /internal/streams/code_intelligence/_availability',
        {
          signal: signal ?? null,
        }
      ),
    enabled,
    // The optional Code Intelligence routes are absent until the feature is
    // enabled. A 404 means setup is incomplete, not a transient failure.
    retry: false,
  });

  const isRouteUnavailable = isNotFoundError(error);

  return {
    available: data?.available ?? false,
    message: data?.message,
    error: isRouteUnavailable ? undefined : error,
    isLoading,
    refetch,
  };
};

const isNotFoundError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  if ('statusCode' in error && error.statusCode === 404) {
    return true;
  }

  if (!('response' in error) || !error.response || typeof error.response !== 'object') {
    return false;
  }

  return 'status' in error.response && error.response.status === 404;
};
