/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { AiIndexHttpItem } from '../../../common/http_api/ai_indices';
import { putAiIndexFeedbackAnalysis } from '../api/ai_indices';
import { getErrorMessage } from '../utils/get_error_message';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

/** Persists the AI index's `feedback_analysis.agent_id`. */
export const useUpdateFeedbackAgent = (aiIndex: AiIndexHttpItem) => {
  const {
    services: { http, notifications },
  } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    // The dedicated route replaces only the feedback analysis block, so the
    // rest of the configuration — including a schedule set elsewhere — is
    // preserved, and the write is allowed on managed AI indices.
    mutationFn: (feedbackAgentId: string | undefined) =>
      putAiIndexFeedbackAnalysis(http, {
        aiIndexId: aiIndex.id,
        feedbackAnalysis: {
          ...(aiIndex.feedback_analysis ?? { enabled: false }),
          // Serialized away when undefined, which is how the agent is cleared.
          agent_id: feedbackAgentId,
        },
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
