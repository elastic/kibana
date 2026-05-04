/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useService } from '@kbn/core-di-browser';
import { useQuery } from '@kbn/react-query';
import { ActionPoliciesApi } from '../services/action_policies_api';
import { actionPolicyKeys } from './query_key_factory';

export const useFetchTags = (params?: { search?: string }) => {
  const actionPoliciesApi = useService(ActionPoliciesApi);

  return useQuery<string[], Error>({
    queryKey: actionPolicyKeys.tags(params?.search),
    queryFn: () => actionPoliciesApi.fetchTags({ search: params?.search }),
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000, // 30 seconds
  });
};
