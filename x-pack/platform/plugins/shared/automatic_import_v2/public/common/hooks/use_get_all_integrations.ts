/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { AllIntegrationsResponseIntegration } from '../../../common';
import { getAllIntegrations } from '../lib/api';
import { useKibana } from './use_kibana';

export interface UseGetAllIntegrationsResult {
  integrations: AllIntegrationsResponseIntegration[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch all created integrations from the automatic_import_v2 backend.
 */
export function useGetAllIntegrations(): UseGetAllIntegrationsResult {
  const { http } = useKibana().services;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['all-integrations'],
    queryFn: async () => {
      return getAllIntegrations({ http });
    },
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  return {
    integrations: data ?? [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}
