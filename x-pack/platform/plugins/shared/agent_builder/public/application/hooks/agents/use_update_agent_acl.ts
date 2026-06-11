/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { AgentAclUpdateRequest } from '../../../../common/agents';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { queryKeys } from '../../query_keys';
import { mutationKeys } from '../../mutation_keys';

interface UseUpdateAgentAclOptions {
  agentId: string;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

export const useUpdateAgentAcl = ({ agentId, onSuccess, onError }: UseUpdateAgentAclOptions) => {
  const { agentService } = useAgentBuilderServices();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateAgentAcl(agentId),
    mutationFn: (update: AgentAclUpdateRequest) => agentService.updateAcl(agentId, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.acl(agentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.byId(agentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.all });
      onSuccess?.();
    },
    onError,
  });
};
