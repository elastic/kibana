/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { useQuery } from '@kbn/react-query';
import { useCallback } from 'react';
import type { UserPrompt } from '../../../../common/http_api/user_prompts';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useToasts } from '../use_toasts';

export interface UsePromptProps {
  promptId?: string;
  onLoadingError?: (error: Error) => void;
}

export const usePrompt = ({ promptId, onLoadingError }: UsePromptProps) => {
  const { promptsService } = useAgentBuilderServices();
  const { addErrorToast } = useToasts();

  const handleError = useCallback(
    (error: Error) => {
      if (promptId) {
        const formattedError = formatAgentBuilderErrorMessage(error);
        addErrorToast({
          title: labels.prompts.loadPromptErrorToast(promptId),
          text: formattedError,
        });
        onLoadingError?.(new Error(formattedError));
      }
    },
    [promptId, addErrorToast, onLoadingError]
  );

  const {
    data: prompt,
    isLoading,
    error,
    isError,
  } = useQuery({
    enabled: !!promptId,
    queryKey: queryKeys.prompts.byId(promptId ?? ''),
    queryFn: () => promptsService.get(promptId!),
    onError: handleError,
  });

  return {
    prompt: prompt as UserPrompt | undefined,
    isLoading,
    error,
    isError,
  };
};
