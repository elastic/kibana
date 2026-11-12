/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useCallback } from 'react';
import type { AiIndexDreamingConfig } from '../../../common/dreaming';
import { setAiIndexDreaming } from '../api/ai_indices';
import { getErrorMessage } from '../utils/get_error_message';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface SaveDreamingConfigArgs {
  aiIndexId: string;
  config: AiIndexDreamingConfig;
}

/**
 * Replaces an AI index's dreaming config. Resolves to whether it saved; a failure shows a toast.
 */
export const useSaveDreamingConfig = () => {
  const {
    services: { http, notifications },
  } = useKibana();
  const queryClient = useQueryClient();

  const { mutateAsync, isLoading } = useMutation<unknown, Error, SaveDreamingConfigArgs>({
    mutationFn: ({ aiIndexId, config }) => setAiIndexDreaming(http, { aiIndexId, config }),
    onSuccess: (_, { aiIndexId }) => {
      queryClient.invalidateQueries({
        queryKey: contextEngineQueryKeys.aiIndex.dreaming(aiIndexId),
      });
    },
    onError: (error) => {
      const toastMessage = getErrorMessage(error);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.saveErrorTitle', {
          defaultMessage: 'Unable to save the dreaming config',
        }),
        ...(toastMessage ? { toastMessage } : {}),
      });
    },
  });

  const saveConfig = useCallback(
    async (args: SaveDreamingConfigArgs): Promise<boolean> => {
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

  return { saveConfig, isSaving: isLoading };
};
