/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { InstallationStatus } from '@kbn/product-doc-base-plugin/common/install_status';
import {
  PerformInstallResponse,
  UninstallResponse,
} from '@kbn/product-doc-base-plugin/common/http_api/installation';
import { REACT_QUERY_KEYS } from '../constants';
import { useKibana } from './use_kibana';
import { useUninstallProductDoc } from './use_uninstall_product_doc';
import { useInstallProductDoc } from './use_install_product_doc';

export interface UseProductDoc {
  status: InstallationStatus | undefined;
  isLoading: boolean;
  installProductDoc: (inferenceId: string) => Promise<PerformInstallResponse>;
  uninstallProductDoc: (inferenceId: string) => Promise<UninstallResponse>;
}

/**
 * Custom hook to get the status of the product documentation installation.
 * It also provides methods to install and uninstall the product documentation.
 *
 * @param inferenceId - The ID of the inference for which to get the product documentation status.
 * @returns An object containing the status of the product documentation, loading state, and methods to install and uninstall the product documentation.
 */
export function useProductDoc(inferenceId: string | undefined): UseProductDoc {
  const { productDocBase } = useKibana().services;

  const { mutateAsync: installProductDoc, isLoading: isInstalling } = useInstallProductDoc();

  const { mutateAsync: uninstallProductDoc, isLoading: isUninstalling } = useUninstallProductDoc();

  const { isLoading, data, refetch, isRefetching } = useQuery({
    networkMode: 'always',
    queryKey: [REACT_QUERY_KEYS.GET_PRODUCT_DOC_STATUS, inferenceId],
    queryFn: async () => {
      return productDocBase!.installation.getStatus({ inferenceId });
    },
    keepPreviousData: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    refetch();
  }, [inferenceId, refetch]);

  // poll the status if when is installing or uninstalling
  useEffect(() => {
    if (
      !(
        data?.overall === 'installing' ||
        data?.overall === 'uninstalling' ||
        isInstalling ||
        isUninstalling
      )
    ) {
      return;
    }

    const interval = setInterval(refetch, 5000);

    // cleanup the interval if unmount
    return () => {
      clearInterval(interval);
    };
  }, [refetch, data?.overall, isInstalling, isUninstalling]);

  const status: InstallationStatus | undefined = useMemo(() => {
    if (!inferenceId || data?.inferenceId !== inferenceId) {
      return undefined;
    }
    if (isInstalling) {
      return 'installing';
    }
    if (isUninstalling) {
      return 'uninstalling';
    }
    return data?.overall;
  }, [inferenceId, isInstalling, isUninstalling, data]);

  return {
    status,
    isLoading: isLoading || isRefetching || isInstalling || isUninstalling,
    installProductDoc,
    uninstallProductDoc,
  };
}
