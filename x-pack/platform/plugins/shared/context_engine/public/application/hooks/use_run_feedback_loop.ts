/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { RunFeedbackLoopResponse } from '../../../common/http_api/feedback_loop';
import { runFeedbackLoop } from '../api/feedback_loop';
import { getErrorMessage } from '../utils/get_error_message';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

/**
 * Starts one analysis run now (`POST /internal/context_engine/ai_index/{id}/feedback_loop/_run`).
 *
 * The run is a workflow execution, so it finishes long after this resolves. Success only means it
 * started; the suggestions appear in the panel on a later refresh.
 */
export const useRunFeedbackLoop = (aiIndexId: string) => {
  const {
    services: { http, notifications },
  } = useKibana();
  const queryClient = useQueryClient();

  return useMutation<RunFeedbackLoopResponse, Error, void>({
    mutationFn: () => runFeedbackLoop(http, { aiIndexId }),
    onSuccess: () => {
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.runStarted', {
          defaultMessage: 'Analysis started',
        }),
        text: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.runStartedText', {
          defaultMessage:
            'Suggestions appear here when the run finishes. This usually takes a few minutes.',
        }),
      });
      // The run may have recorded suggestions by the time the user looks again; a refetch now is
      // cheap and covers a run that finished quickly.
      queryClient.invalidateQueries({
        queryKey: contextEngineQueryKeys.improvements.all(aiIndexId),
      });
    },
    onError: (error) => {
      const toastMessage = getErrorMessage(error);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.runError', {
          defaultMessage: 'Unable to start the analysis',
        }),
        ...(toastMessage ? { toastMessage } : {}),
      });
    },
  });
};
