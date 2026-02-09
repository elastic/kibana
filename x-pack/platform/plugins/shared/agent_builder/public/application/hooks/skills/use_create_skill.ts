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
import type {
  CreateSkillPayload,
  CreateSkillResponse,
} from '../../../../common/http_api/skills';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

type CreateSkillMutationOptions = UseMutationOptions<
  CreateSkillResponse,
  Error,
  CreateSkillPayload
>;

export type CreateSkillSuccessCallback = NonNullable<CreateSkillMutationOptions['onSuccess']>;
export type CreateSkillErrorCallback = NonNullable<CreateSkillMutationOptions['onError']>;

export interface UseCreateSkillServiceProps {
  onSuccess?: CreateSkillSuccessCallback;
  onError?: CreateSkillErrorCallback;
}

export const useCreateSkillService = ({
  onSuccess,
  onError,
}: UseCreateSkillServiceProps = {}) => {
  const queryClient = useQueryClient();
  const { skillsService } = useAgentBuilderServices();

  const { mutate, mutateAsync, isLoading } = useMutation<
    CreateSkillResponse,
    Error,
    CreateSkillPayload
  >({
    mutationFn: (skill) => skillsService.create(skill),
    onSuccess,
    onError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.skills.all }),
  });

  return { createSkillSync: mutate, createSkill: mutateAsync, isLoading };
};

export interface UseCreateSkillProps {
  onSuccess?: CreateSkillSuccessCallback;
  onError?: CreateSkillErrorCallback;
}

export const useCreateSkill = ({ onSuccess, onError }: UseCreateSkillProps = {}) => {
  const { addSuccessToast, addErrorToast } = useToasts();

  const handleSuccess = useCallback<CreateSkillSuccessCallback>(
    (response, variables, context) => {
      addSuccessToast({
        title: labels.skills.createSkillSuccessToast(response.id),
      });
      onSuccess?.(response, variables, context);
    },
    [addSuccessToast, onSuccess]
  );

  const handleError = useCallback<CreateSkillErrorCallback>(
    (error, variables, context) => {
      addErrorToast({
        title: labels.skills.createSkillErrorToast,
        text: formatAgentBuilderErrorMessage(error),
      });
      onError?.(error, variables, context);
    },
    [addErrorToast, onError]
  );

  const { createSkill, isLoading: isSubmitting } = useCreateSkillService({
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const handleCreateSkill = useCallback(
    async (skill: CreateSkillPayload) => {
      return createSkill(skill);
    },
    [createSkill]
  );

  return {
    isSubmitting,
    createSkill: handleCreateSkill,
  };
};
