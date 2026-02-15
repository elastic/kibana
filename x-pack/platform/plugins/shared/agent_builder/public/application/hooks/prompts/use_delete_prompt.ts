/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useCallback } from 'react';
import type { DeleteUserPromptResponse } from '../../../../common/http_api/user_prompts';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

export interface UseDeletePromptProps {
  onSuccess?: (response: DeleteUserPromptResponse, promptId: string) => void;
  onError?: (error: Error, promptId: string) => void;
}

export const useDeletePrompt = ({ onSuccess, onError }: UseDeletePromptProps = {}) => {
  const queryClient = useQueryClient();
  const { promptsService } = useAgentBuilderServices();
  const { addSuccessToast, addErrorToast } = useToasts();

  const handleSuccess = useCallback(
    (response: DeleteUserPromptResponse, promptId: string) => {
      if (response.success) {
        addSuccessToast({
          title: labels.prompts.deletePromptSuccessToast(promptId),
        });
      } else {
        addErrorToast({
          title: labels.prompts.deletePromptErrorToast,
        });
      }
      onSuccess?.(response, promptId);
    },
    [addSuccessToast, addErrorToast, onSuccess]
  );

  const handleError = useCallback(
    (error: Error, promptId: string) => {
      addErrorToast({
        title: labels.prompts.deletePromptErrorToast,
        text: formatAgentBuilderErrorMessage(error),
      });
      onError?.(error, promptId);
    },
    [addErrorToast, onError]
  );

  const { mutate, mutateAsync, isLoading } = useMutation<DeleteUserPromptResponse, Error, string>({
    mutationFn: (promptId) => promptsService.delete(promptId),
    onSuccess: handleSuccess,
    onError: handleError,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prompts.all });
    },
  });

  return {
    deletePrompt: mutateAsync,
    deletePromptSync: mutate,
    isLoading,
  };
};
