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
  CreateUserPromptPayload,
  CreateUserPromptResponse,
} from '../../../../common/http_api/user_prompts';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

export interface UseCreatePromptProps {
  onSuccess?: (response: CreateUserPromptResponse, variables: CreateUserPromptPayload) => void;
  onError?: (error: Error, variables: CreateUserPromptPayload) => void;
}

export const useCreatePrompt = ({ onSuccess, onError }: UseCreatePromptProps = {}) => {
  const queryClient = useQueryClient();
  const { promptsService } = useAgentBuilderServices();
  const { addSuccessToast, addErrorToast } = useToasts();

  const handleSuccess = useCallback(
    (response: CreateUserPromptResponse, variables: CreateUserPromptPayload) => {
      addSuccessToast({
        title: labels.prompts.createPromptSuccessToast(response.id),
      });
      onSuccess?.(response, variables);
    },
    [addSuccessToast, onSuccess]
  );

  const handleError = useCallback(
    (error: Error, variables: CreateUserPromptPayload) => {
      addErrorToast({
        title: labels.prompts.createPromptErrorToast,
        text: formatAgentBuilderErrorMessage(error),
      });
      onError?.(error, variables);
    },
    [addErrorToast, onError]
  );

  const { mutate, mutateAsync, isLoading } = useMutation<
    CreateUserPromptResponse,
    Error,
    CreateUserPromptPayload
  >({
    mutationFn: (payload) => promptsService.create(payload),
    onSuccess: handleSuccess,
    onError: handleError,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prompts.all });
    },
  });

  return {
    createPrompt: mutateAsync,
    createPromptSync: mutate,
    isLoading,
  };
};
