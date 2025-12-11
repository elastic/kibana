/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { InstallationStatusResponse } from '../../common/http_api/installation';
import type { ProductDocBasePluginStart } from '../types';
import { REACT_QUERY_KEYS } from './constants';

const POLLING_INTERVAL_MS = 5000; // Poll every 5 seconds during installation/uninstallation

export interface UseProductDocStatusOptions {
  /** The inference ID to check status for. Defaults to ELSER. */
  inferenceId?: string;
}

/**
 * Hook to fetch the installation status of product documentation.
 * Automatically polls when installation or uninstallation is in progress.
 */
export function useProductDocStatus(
  productDocBase: ProductDocBasePluginStart,
  options: UseProductDocStatusOptions = {}
) {
  const { inferenceId = defaultInferenceEndpoints.ELSER } = options;

  const { isLoading, isError, isSuccess, isRefetching, data, refetch } = useQuery({
    queryKey: [REACT_QUERY_KEYS.GET_PRODUCT_DOC_STATUS, inferenceId],
    queryFn: async (): Promise<InstallationStatusResponse> => {
      return productDocBase.installation.getStatus({ inferenceId });
    },
    keepPreviousData: false,
    refetchOnWindowFocus: false,
    // Poll when installation or uninstallation is in progress
    refetchInterval: (queryData) => {
      const status = queryData?.overall;
      if (status === 'installing' || status === 'uninstalling') {
        return POLLING_INTERVAL_MS;
      }
      return false;
    },
  });

  return {
    status: data,
    refetch,
    isLoading,
    isRefetching,
    isSuccess,
    isError,
  };
}
