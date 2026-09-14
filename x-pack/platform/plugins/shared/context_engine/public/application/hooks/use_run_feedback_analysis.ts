/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { RunFeedbackAnalysisResponse } from '../../../common/http_api/improvements';
import { runFeedbackAnalysis } from '../api/improvements';
import { getErrorMessage } from '../utils/get_error_message';
import { isConflict } from '../utils/is_conflict';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

/**
 * Starts one analysis run off-schedule.
 *
 * The run is asynchronous, so success here only means it started. Improvements are invalidated on
 * the way out so the panel picks up whatever the run records, whenever it finishes.
 */
export const useRunFeedbackAnalysis = (aiIndexId: string) => {
  const {
    services: { http, notifications },
  } = useKibana();
  const queryClient = useQueryClient();

  return useMutation<RunFeedbackAnalysisResponse, Error, void>({
    mutationFn: () => runFeedbackAnalysis(http, { aiIndexId }),
    onSuccess: () => {
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.runStartedTitle', {
          defaultMessage: 'Analysis started',
        }),
        text: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.runStartedBody', {
          defaultMessage:
            'Any improvements it suggests appear here once the run finishes. This can take a few minutes.',
        }),
      });
      queryClient.invalidateQueries({
        queryKey: contextEngineQueryKeys.improvements.all(aiIndexId),
      });
    },
    onError: (error: Error) => {
      // A run was already in flight, so the analysis the user wanted is happening — it just is not
      // theirs. Reported as what is true rather than as a failure, and the improvements are
      // invalidated so the panels pick up whatever that run records.
      if (isConflict(error)) {
        queryClient.invalidateQueries({
          queryKey: contextEngineQueryKeys.improvements.all(aiIndexId),
        });
        notifications.toasts.addWarning({
          title: i18n.translate(
            'xpack.contextEngine.aiIndexDetail.improvements.runAlreadyRunningTitle',
            { defaultMessage: 'Analysis is already running' }
          ),
          text: i18n.translate(
            'xpack.contextEngine.aiIndexDetail.improvements.runAlreadyRunningBody',
            {
              defaultMessage:
                'Only one run at a time analyzes an index. Any improvements it suggests appear here when it finishes.',
            }
          ),
        });
        return;
      }

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
