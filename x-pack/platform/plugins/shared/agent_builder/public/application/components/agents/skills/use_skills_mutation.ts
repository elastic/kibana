/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type {
  AgentDefinition,
  PublicSkillDefinition,
  PublicSkillSummary,
} from '@kbn/agent-builder-common';
import { useCallback, useMemo } from 'react';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { queryKeys } from '../../../query_keys';
import { labels } from '../../../utils/i18n';
import { useToasts } from '../../../hooks/use_toasts';

export const useSkillsMutation = ({ agent }: { agent: AgentDefinition | null }) => {
  const { agentService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const { addSuccessToast, addErrorToast } = useToasts();
  const agentId = agent?.id;

  const agentQueryKey = queryKeys.agentProfiles.byId(agentId);

  const getCurrentSkillIds = useCallback((): string[] => {
    const currentAgent = queryClient.getQueryData<AgentDefinition>(agentQueryKey);
    return currentAgent?.configuration?.skill_ids ?? [];
  }, [queryClient, agentQueryKey]);

  const updateSkillsMutation = useMutation({
    mutationFn: (newSkillIds: string[]) => {
      if (!agentId) {
        throw new Error('Agent id is required to update skills');
      }
      return agentService.update(agentId, {
        configuration: { skill_ids: newSkillIds },
      });
    },
    onMutate: async (newSkillIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: agentQueryKey });

      const previousAgent = queryClient.getQueryData<AgentDefinition>(agentQueryKey);

      if (previousAgent) {
        queryClient.setQueryData<AgentDefinition>(agentQueryKey, {
          ...previousAgent,
          configuration: {
            ...previousAgent.configuration,
            skill_ids: newSkillIds,
          },
        });
      }

      return { previousAgent };
    },
    onError: (_err, _newSkillIds, context) => {
      if (context?.previousAgent) {
        queryClient.setQueryData<AgentDefinition>(agentQueryKey, context.previousAgent);
      }
      addErrorToast({ title: labels.agentSkills.updateSkillsErrorToast });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: agentQueryKey });
    },
  });

  const handleAddSkill = useCallback(
    (
      skill: PublicSkillSummary | PublicSkillDefinition,
      { onSuccess }: { onSuccess?: (skillId: string) => void } = {}
    ) => {
      const currentIds = getCurrentSkillIds();
      if (currentIds.includes(skill.id)) return;
      const newIds = [...currentIds, skill.id];

      updateSkillsMutation.mutate(newIds, {
        onSuccess: () => {
          onSuccess?.(skill.id);
          addSuccessToast({ title: labels.agentSkills.addSkillSuccessToast(skill.name) });
        },
      });
    },
    [getCurrentSkillIds, updateSkillsMutation, addSuccessToast]
  );

  const handleRemoveSkill = useCallback(
    (skill: PublicSkillSummary) => {
      const currentIds = getCurrentSkillIds();
      const newIds = currentIds.filter((id) => id !== skill.id);
      updateSkillsMutation.mutate(newIds, {
        onSuccess: () => {
          addSuccessToast({ title: labels.agentSkills.removeSkillSuccessToast(skill.name) });
        },
      });
    },
    [getCurrentSkillIds, updateSkillsMutation, addSuccessToast]
  );

  const handlers = useMemo(
    () => ({ handleAddSkill, handleRemoveSkill }),
    [handleAddSkill, handleRemoveSkill]
  );

  return handlers;
};
