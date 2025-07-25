/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { REACT_QUERY_KEYS } from '../constants';
import { useKibana } from './use_kibana';
import { useUninstallProductDoc } from './use_uninstall_product_doc';
import { useInstallProductDoc } from './use_install_product_doc';

export function useGetProductDoc(inferenceId: string | undefined) {
  const { productDocBase } = useKibana().services;

  const { mutateAsync: installProductDoc, isLoading: isInstalling } = useInstallProductDoc();

  const { mutateAsync: uninstallProductDoc, isLoading: isUninstalling } = useUninstallProductDoc();

  const { isLoading, data, refetch } = useQuery({
    queryKey: [REACT_QUERY_KEYS.GET_PRODUCT_DOC_STATUS, inferenceId],
    queryFn: async () => {
      return productDocBase!.installation.getStatus({ inferenceId });
    },
    keepPreviousData: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    refetch();
  }, [inferenceId, isInstalling, isUninstalling, refetch]);

  return {
    status: data?.inferenceId === inferenceId ? data?.overall : undefined,
    refetch,
    isLoading,
    installProductDoc,
    uninstallProductDoc,
  };
}
