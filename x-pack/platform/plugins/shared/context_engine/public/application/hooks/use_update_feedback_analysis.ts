/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { AiIndexFeedbackAnalysis, AiIndexHttpItem } from '../../../common/http_api/ai_indices';
import { putAiIndexFeedbackAnalysis } from '../api/ai_indices';
import { getErrorMessage } from '../utils/get_error_message';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

/**
 * Persists a change to the AI index's feedback analysis configuration.
 *
 * The dedicated route replaces the whole block, so each change is merged onto what is stored rather
 * than sent alone — otherwise changing the interval would clear the agent. It is also the route
 * that makes the configuration writable on a managed AI index, whose definition is otherwise fixed.
 */
export const useUpdateFeedbackAnalysis = (aiIndex: AiIndexHttpItem) => {
  const {
    services: { http, notifications },
  } = useKibana();
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, Partial<AiIndexFeedbackAnalysis>>({
    mutationFn: (changes) =>
      putAiIndexFeedbackAnalysis(http, {
        aiIndexId: aiIndex.id,
        feedbackAnalysis: {
          ...(aiIndex.feedback_analysis ?? { enabled: false }),
          ...changes,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: contextEngineQueryKeys.aiIndex.detail(aiIndex.id),
        exact: true,
      });
      // Turning analysis off leaves nothing scheduled, so what is listed can go stale.
      queryClient.invalidateQueries({
        queryKey: contextEngineQueryKeys.improvements.all(aiIndex.id),
      });
    },
    onError: (error: Error) => {
      const toastMessage = getErrorMessage(error);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.configError', {
          defaultMessage: 'Unable to update the analysis settings',
        }),
        ...(toastMessage ? { toastMessage } : {}),
      });
    },
  });
};
