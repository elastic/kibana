/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useCallback } from 'react';
import type { DreamingTemplateConfig } from '../../../common/dreaming_templates';
import { setAiIndexDreaming } from '../api/ai_indices';
import { getErrorMessage } from '../utils/get_error_message';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface ApplyDreamingTemplateArgs {
  aiIndexId: string;
  config: DreamingTemplateConfig;
}

/**
 * Saves an example dreaming config, as filled in during onboarding, on an AI index and turns
 * dreaming on. Resolves to whether it saved; a failure shows a toast.
 */
export const useApplyDreamingTemplate = () => {
  const {
    services: { http, notifications },
  } = useKibana();
  const queryClient = useQueryClient();

  const { mutateAsync, isLoading } = useMutation<unknown, Error, ApplyDreamingTemplateArgs>({
    mutationFn: ({ aiIndexId, config }) =>
      setAiIndexDreaming(http, { aiIndexId, config: { enabled: true, ...config } }),
    onSuccess: (_, { aiIndexId }) => {
      queryClient.invalidateQueries({
        queryKey: contextEngineQueryKeys.aiIndex.dreaming(aiIndexId),
      });
    },
    onError: (error) => {
      const toastMessage = getErrorMessage(error);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.contextEngine.dreamingTemplate.saveErrorTitle', {
          defaultMessage: 'Unable to save the dreaming config',
        }),
        ...(toastMessage ? { toastMessage } : {}),
      });
    },
  });

  const applyTemplate = useCallback(
    async (args: ApplyDreamingTemplateArgs): Promise<boolean> => {
      try {
        await mutateAsync(args);
        return true;
      } catch {
        // The error toast is surfaced by the mutation's onError handler.
        return false;
      }
    },
    [mutateAsync]
  );

  return { applyTemplate, isSaving: isLoading };
};
