/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { GetDataStreamResultsResponse } from '../lib/api';
import { getDataStreamResults } from '../lib/api';
import { useKibana } from './use_kibana';

export interface UseGetDataStreamResultsResult {
  data: GetDataStreamResultsResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch data stream results (ingest pipeline and processed documents) from the automatic_import_v2 backend.
 */
export function useGetDataStreamResults(
  integrationId: string | undefined,
  dataStreamId: string | undefined
): UseGetDataStreamResultsResult {
  const { http } = useKibana().services;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dataStreamResults', integrationId, dataStreamId],
    queryFn: async () => {
      if (!integrationId || !dataStreamId) {
        return undefined;
      }
      return getDataStreamResults({ http, integrationId, dataStreamId });
    },
    enabled: !!integrationId && !!dataStreamId,
  });

  return {
    data,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}
