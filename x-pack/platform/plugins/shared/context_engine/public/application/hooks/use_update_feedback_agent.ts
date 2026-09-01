/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { AiIndexHttpItem } from '../../../common/http_api/ai_indices';
import { putAiIndex } from '../api/ai_indices';
import { getErrorMessage } from '../utils/get_error_message';
import { contextEngineQueryKeys } from './query_keys';
import { toProperties } from './use_save_ai_index_field';
import { useKibana } from './use_kibana';

/** Persists the AI index's `feedback_agent_id`. */
export const useUpdateFeedbackAgent = (aiIndex: AiIndexHttpItem) => {
  const {
    services: { http, notifications },
  } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (feedbackAgentId: string | undefined) =>
      putAiIndex(http, {
        aiIndexId: aiIndex.id,
        properties: { ...toProperties(aiIndex), feedback_agent_id: feedbackAgentId },
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: contextEngineQueryKeys.aiIndex.detail(aiIndex.id),
        exact: true,
      }),
    onError: (error: Error) => {
      const toastMessage = getErrorMessage(error);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.contextEngine.aiIndexDetail.signals.feedbackAgent.saveError', {
          defaultMessage: 'Unable to update the analysis agent',
        }),
        ...(toastMessage ? { toastMessage } : {}),
      });
    },
  });
};
