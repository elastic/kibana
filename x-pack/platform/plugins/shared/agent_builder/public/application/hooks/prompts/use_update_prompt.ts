/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useCallback } from 'react';
import type {
  UpdateUserPromptPayload,
  UpdateUserPromptResponse,
} from '../../../../common/http_api/user_prompts';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

export interface UseUpdatePromptProps {
  onSuccess?: (
    response: UpdateUserPromptResponse,
    variables: { promptId: string; payload: UpdateUserPromptPayload }
  ) => void;
  onError?: (
    error: Error,
    variables: { promptId: string; payload: UpdateUserPromptPayload }
  ) => void;
}

export const useUpdatePrompt = ({ onSuccess, onError }: UseUpdatePromptProps = {}) => {
  const queryClient = useQueryClient();
  const { promptsService } = useAgentBuilderServices();
  const { addSuccessToast, addErrorToast } = useToasts();

  const handleSuccess = useCallback(
    (
      response: UpdateUserPromptResponse,
      variables: { promptId: string; payload: UpdateUserPromptPayload }
    ) => {
      addSuccessToast({
        title: labels.prompts.updatePromptSuccessToast(response.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.prompts.byId(variables.promptId) });
      onSuccess?.(response, variables);
    },
    [addSuccessToast, queryClient, onSuccess]
  );

  const handleError = useCallback(
    (error: Error, variables: { promptId: string; payload: UpdateUserPromptPayload }) => {
      addErrorToast({
        title: labels.prompts.updatePromptErrorToast,
        text: formatAgentBuilderErrorMessage(error),
      });
      onError?.(error, variables);
    },
    [addErrorToast, onError]
  );

  const { mutate, mutateAsync, isLoading } = useMutation<
    UpdateUserPromptResponse,
    Error,
    { promptId: string; payload: UpdateUserPromptPayload }
  >({
    mutationFn: ({ promptId, payload }) => promptsService.update(promptId, payload),
    onSuccess: handleSuccess,
    onError: handleError,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prompts.all });
    },
  });

  return {
    updatePrompt: mutateAsync,
    updatePromptSync: mutate,
    isLoading,
  };
};
