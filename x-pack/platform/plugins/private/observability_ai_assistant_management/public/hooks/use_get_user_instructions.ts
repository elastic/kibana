/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { REACT_QUERY_KEYS } from '../constants';
import { useKibana } from './use_kibana';

export function useGetUserInstructions() {
  const { observabilityAIAssistant } = useKibana().services;
  const observabilityAIAssistantApi = observabilityAIAssistant.service.callApi;

  const { isLoading, isError, isSuccess, isRefetching, data, refetch } = useQuery({
    queryKey: [REACT_QUERY_KEYS.GET_KB_USER_INSTRUCTIONS],
    queryFn: async ({ signal }) => {
      if (!signal) {
        throw new Error('Abort signal missing');
      }

      return observabilityAIAssistantApi(
        `GET /internal/observability_ai_assistant/kb/user_instructions`,
        { signal }
      );
    },
  });

  return {
    userInstructions: data?.userInstructions,
    refetch,
    isLoading,
    isRefetching,
    isSuccess,
    isError,
  };
}
