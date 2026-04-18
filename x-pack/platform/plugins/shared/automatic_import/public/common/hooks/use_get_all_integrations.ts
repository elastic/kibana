/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { isHttpFetchError } from '@kbn/core-http-browser';

import type { AllIntegrationsResponseIntegration } from '../../../common';
import { getAllIntegrations } from '../lib/api';
import { useKibana } from './use_kibana';

export interface UseGetAllIntegrationsResult {
  integrations: AllIntegrationsResponseIntegration[];
  isInitialLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch all created integrations from the automatic_import backend.
 */
export function useGetAllIntegrations(): UseGetAllIntegrationsResult {
  const { http } = useKibana().services;

  const { data, isInitialLoading, isError, error, refetch } = useQuery({
    queryKey: ['all-integrations'],
    queryFn: async ({ signal }) => {
      return getAllIntegrations({ http, abortSignal: signal });
    },
    refetchOnWindowFocus: true,
    retry: (failureCount, err) => {
      if (failureCount >= 3) {
        return false;
      }

      if (isHttpFetchError(err) && err.response?.status === 404) {
        return false;
      }

      return true;
    },
  });

  return {
    integrations: data ?? [],
    isInitialLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}
