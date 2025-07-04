/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { REACT_QUERY_KEYS } from '../constants';
import { useKibana } from './use_kibana';

export function useGetProductDocStatus(inferenceId: string | undefined) {
  const { productDocBase } = useKibana().services;

  const { isLoading, isError, isSuccess, isRefetching, data, refetch } = useQuery({
    queryKey: [REACT_QUERY_KEYS.GET_PRODUCT_DOC_STATUS, inferenceId],
    queryFn: async () => {
      return productDocBase!.installation.getStatus({ inferenceId });
    },
    keepPreviousData: false,
    refetchOnWindowFocus: false,
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
