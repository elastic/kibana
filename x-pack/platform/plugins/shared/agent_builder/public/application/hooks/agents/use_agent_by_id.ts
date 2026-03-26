/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { queryKeys } from '../../query_keys';

const useFetchAgentById = () => {
  const { agentService } = useAgentBuilderServices();
  return (agentId?: string) => {
    if (!agentId) {
      return Promise.reject(new Error('Agent ID is required'));
    }
    return agentService.get(agentId);
  };
};

export const useAgentBuilderAgentById = (agentId?: string) => {
  const fetchAgentById = useFetchAgentById();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.agentProfiles.byId(agentId),
    queryFn: () => fetchAgentById(agentId),
    enabled: !!agentId,
  });

  return { agent: data ?? null, isLoading, error };
};
