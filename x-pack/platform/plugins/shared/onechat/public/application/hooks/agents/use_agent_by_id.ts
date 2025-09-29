/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOnechatServices } from '../use_onechat_service';
import { queryKeys } from '../../query_keys';

const useFetchAgentById = () => {
  const { agentService } = useOnechatServices();
  return (agentId?: string) => {
    if (!agentId) {
      return Promise.reject(new Error('Agent ID is required'));
    }
    return agentService.get(agentId);
  };
};

export const useOnechatAgentById = (agentId?: string) => {
  const fetchAgentById = useFetchAgentById();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.agentProfiles.byId(agentId),
    queryFn: () => fetchAgentById(agentId),
    enabled: !!agentId,
  });

  return { agent: data ?? null, isLoading, error };
};

export const usePrefetchAgentById = () => {
  const fetchAgentById = useFetchAgentById();
  const queryClient = useQueryClient();
  return (agentId?: string) => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.agentProfiles.byId(agentId),
      queryFn: () => fetchAgentById(agentId),
      staleTime: 10 * 1000,
    });
  };
};
