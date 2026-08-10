/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { useCallback } from 'react';
import type { AgentDefinitionWithPermissions } from '../../../../common/http_api/agents';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

interface UpdateAiIndicesVariables {
  agentId: string;
  agentName: string;
  aiIndices: string[];
}

interface MutationContext {
  previousAgents: AgentDefinitionWithPermissions[] | undefined;
}

/**
 * Assigns and unassigns AI indices on agents from the Context page.
 *
 * Unlike `useAgentConnectors`, which is scoped to a single agent, this drives a table over the
 * whole agent list, so the optimistic update patches the list cache. Both the list and the
 * single-agent caches are invalidated on settle, otherwise an agent detail page visited straight
 * after an edit here would show stale `ai_indices`.
 */
export const useAgentAiIndices = () => {
  const { agentService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const { addSuccessToast, addErrorToast } = useToasts();

  const mutation = useMutation<
    AgentDefinitionWithPermissions,
    Error,
    UpdateAiIndicesVariables,
    MutationContext
  >({
    mutationFn: ({ agentId, aiIndices }) =>
      agentService.update(agentId, { configuration: { ai_indices: aiIndices } }),
    onMutate: async ({ agentId, aiIndices }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.agentProfiles.all });

      const previousAgents = queryClient.getQueryData<AgentDefinitionWithPermissions[]>(
        queryKeys.agentProfiles.all
      );

      queryClient.setQueryData<AgentDefinitionWithPermissions[]>(
        queryKeys.agentProfiles.all,
        (agents) =>
          (agents ?? []).map((agent) =>
            agent.id === agentId
              ? { ...agent, configuration: { ...agent.configuration, ai_indices: aiIndices } }
              : agent
          )
      );

      return { previousAgents };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousAgents) {
        queryClient.setQueryData(queryKeys.agentProfiles.all, context.previousAgents);
      }
      addErrorToast({ title: labels.context.updateErrorToast });
    },
    onSuccess: (_data, { agentName }) => {
      addSuccessToast({ title: labels.context.updateSuccessToast(agentName) });
    },
    onSettled: (_data, _error, { agentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.byId(agentId) });
    },
  });

  const { mutate } = mutation;

  const setAiIndices = useCallback(
    (variables: UpdateAiIndicesVariables) => mutate(variables),
    [mutate]
  );

  return { setAiIndices, isUpdating: mutation.isLoading };
};
