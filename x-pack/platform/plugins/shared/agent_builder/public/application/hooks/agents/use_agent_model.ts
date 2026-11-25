/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { GetAgentModelResponse } from '../../../../common/http_api/agents';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useAgentBuilderAgentById } from './use_agent_by_id';

export interface UseAgentModelResult {
  isLoading: boolean;
  isLocked: boolean;
  connectorName?: string;
}

export const useAgentModel = (agentId?: string): UseAgentModelResult => {
  const { agentService } = useAgentBuilderServices();
  const { agent, isLoading: isAgentLoading } = useAgentBuilderAgentById(agentId);
  const isLocked = agent?.configuration.inference_feature_id !== undefined;

  const { data } = useQuery<GetAgentModelResponse, Error>({
    queryKey: queryKeys.agentProfiles.model(agentId),
    queryFn: () =>
      agentId
        ? agentService.getAgentModel(agentId)
        : Promise.reject(new Error('Agent ID is required')),
    enabled: isLocked && Boolean(agentId),
  });

  return {
    isLoading: Boolean(agentId) && isAgentLoading,
    isLocked,
    connectorName: isLocked ? data?.connector?.name : undefined,
  };
};
