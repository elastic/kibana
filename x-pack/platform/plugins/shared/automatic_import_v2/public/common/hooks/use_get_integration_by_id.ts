/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { IntegrationResponse } from '../../../common';
import { getIntegrationById } from '../lib/api';
import { useKibana } from './use_kibana';

export interface UseGetIntegrationByIdResult {
  integration: IntegrationResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch a single integration by ID from the automatic_import_v2 backend.
 */
export function useGetIntegrationById(
  integrationId: string | undefined
): UseGetIntegrationByIdResult {
  const { http } = useKibana().services;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['integration', integrationId],
    queryFn: async () => {
      if (!integrationId) {
        return undefined;
      }
      const response = await getIntegrationById({ http, integrationId });

      return response.integrationResponse;
    },
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
    enabled: !!integrationId,
  });

  return {
    integration: data,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}
