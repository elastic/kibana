/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { REACT_QUERY_KEYS } from './const';
import { useAssistantContext } from '../../../..';

export function useGetProductDocStatus() {
  const { productDocBase } = useAssistantContext();

  const { isLoading, isError, isSuccess, isRefetching, data, refetch } = useQuery({
    queryKey: [REACT_QUERY_KEYS.GET_PRODUCT_DOC_STATUS],
    queryFn: async () => {
      return productDocBase.installation.getStatus({
        inferenceId: defaultInferenceEndpoints.ELSER,
      });
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
