/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { ResourceType } from '@kbn/product-doc-common';
import type {
  InstallationStatusResponse,
  SecurityLabsInstallStatusResponse,
} from '../../common/http_api/installation';
import type { ProductDocBasePluginStart } from '../types';
import { REACT_QUERY_KEYS } from './constants';

const POLLING_INTERVAL_MS = 5000; // Poll every 5 seconds during installation/uninstallation

export interface UseProductDocStatusOptions {
  /** The inference ID to check status for. Defaults to ELSER. */
  inferenceId?: string;
  /** The resource type to check status for. Defaults to product docs. */
  resourceType?: ResourceType;
}

const isProductDocsStatus = (
  value: InstallationStatusResponse | SecurityLabsInstallStatusResponse | undefined
): value is InstallationStatusResponse => {
  return value != null && typeof value === 'object' && 'overall' in value;
};

/**
 * Hook to fetch the installation status of product documentation.
 * Automatically polls when installation or uninstallation is in progress.
 */
export function useProductDocStatus(
  productDocBase: ProductDocBasePluginStart,
  options: UseProductDocStatusOptions = {}
) {
  const { inferenceId = defaultInferenceEndpoints.ELSER, resourceType } = options;

  const { isLoading, isError, isSuccess, isRefetching, data, refetch } = useQuery({
    queryKey: [REACT_QUERY_KEYS.GET_PRODUCT_DOC_STATUS, inferenceId, resourceType],
    queryFn: async (): Promise<InstallationStatusResponse | SecurityLabsInstallStatusResponse> => {
      // The response shape depends on resourceType (product docs vs security labs)
      return productDocBase.installation.getStatus({ inferenceId, resourceType });
    },
    keepPreviousData: false,
    refetchOnWindowFocus: false,
    // Poll when installation or uninstallation is in progress
    refetchInterval: (queryData) => {
      const status = isProductDocsStatus(queryData) ? queryData.overall : queryData?.status;
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
