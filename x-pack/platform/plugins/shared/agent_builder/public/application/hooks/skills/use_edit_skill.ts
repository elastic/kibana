/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import type { UseMutationOptions } from '@kbn/react-query';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useCallback } from 'react';
import type { UpdateSkillPayload, UpdateSkillResponse } from '../../../../common/http_api/skills';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';
import { useSkill } from './use_skills';

interface EditSkillMutationVariables {
  skillId: string;
  skill: UpdateSkillPayload;
}

type EditSkillMutationOptions = UseMutationOptions<
  UpdateSkillResponse,
  Error,
  EditSkillMutationVariables
>;

export type EditSkillSuccessCallback = NonNullable<EditSkillMutationOptions['onSuccess']>;
export type EditSkillErrorCallback = NonNullable<EditSkillMutationOptions['onError']>;

export interface UseEditSkillServiceProps {
  onSuccess?: EditSkillSuccessCallback;
  onError?: EditSkillErrorCallback;
}

export const useEditSkillService = ({ onSuccess, onError }: UseEditSkillServiceProps = {}) => {
  const queryClient = useQueryClient();
  const { skillsService } = useAgentBuilderServices();

  const { mutate, mutateAsync, isLoading } = useMutation<
    UpdateSkillResponse,
    Error,
    EditSkillMutationVariables
  >({
    mutationFn: ({ skillId, skill }) => skillsService.update({ skillId, ...skill }),
    onSuccess,
    onError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.skills.all }),
  });

  return { updateSkillSync: mutate, updateSkill: mutateAsync, isLoading };
};

export interface UseEditSkillProps {
  skillId: string;
  onSuccess?: EditSkillSuccessCallback;
  onError?: EditSkillErrorCallback;
  onLoadingError?: (error: Error) => void;
}

export const useEditSkill = ({
  skillId,
  onSuccess,
  onError,
  onLoadingError,
}: UseEditSkillProps) => {
  const { addSuccessToast, addErrorToast } = useToasts();
  const { skill: editingSkill, isLoading } = useSkill({ skillId, onLoadingError });

  const handleSuccess = useCallback<EditSkillSuccessCallback>(
    (response, variables, context) => {
      addSuccessToast({
        title: labels.skills.editSkillSuccessToast(response.id),
      });
      onSuccess?.(response, variables, context);
    },
    [addSuccessToast, onSuccess]
  );

  const handleError = useCallback<EditSkillErrorCallback>(
    (error, variables, context) => {
      addErrorToast({
        title: labels.skills.editSkillErrorToast(variables.skillId),
        text: formatAgentBuilderErrorMessage(error),
      });
      onError?.(error, variables, context);
    },
    [addErrorToast, onError]
  );

  const { updateSkill, isLoading: isSubmitting } = useEditSkillService({
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const handleEditSkill = useCallback(
    async (skillData: UpdateSkillPayload) => {
      return updateSkill({ skillId, skill: skillData });
    },
    [updateSkill, skillId]
  );

  return {
    skill: editingSkill,
    isLoading,
    isSubmitting,
    editSkill: handleEditSkill,
  };
};
