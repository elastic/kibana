/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type {
  GetFeedbackScheduleResponse,
  PutFeedbackScheduleResponse,
} from '../../../common/http_api/feedback_loop';
import { getFeedbackSchedule, putFeedbackSchedule } from '../api/feedback_loop';
import { getErrorMessage } from '../utils/get_error_message';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface UseFeedbackScheduleResult {
  isEnabled: boolean;
  isLoading: boolean;
  error: Error | undefined;
  /** Turns the recurring analysis on or off. */
  setEnabled: (enabled: boolean) => void;
  isSaving: boolean;
}

/**
 * Reads and toggles an AI index's recurring analysis
 * (`GET`/`PUT /internal/context_engine/ai_index/{id}/feedback_loop/schedule`).
 *
 * Enabling runs under the caller's own credentials, which is what the scheduled runs then use.
 */
export const useFeedbackSchedule = ({
  aiIndexId,
  enabled = true,
}: {
  aiIndexId: string | undefined;
  enabled?: boolean;
}): UseFeedbackScheduleResult => {
  const {
    services: { http, notifications },
  } = useKibana();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<GetFeedbackScheduleResponse, Error>({
    queryKey: contextEngineQueryKeys.feedbackLoop.schedule(aiIndexId ?? ''),
    queryFn: ({ signal }) => {
      if (!aiIndexId) {
        throw new Error('AI index id is required');
      }
      return getFeedbackSchedule(http, { aiIndexId, signal });
    },
    enabled: enabled && aiIndexId !== undefined,
  });

  const { mutate, isLoading: isSaving } = useMutation<PutFeedbackScheduleResponse, Error, boolean>({
    mutationFn: (nextEnabled) => {
      if (!aiIndexId) {
        throw new Error('AI index id is required');
      }
      return putFeedbackSchedule(http, { aiIndexId, enabled: nextEnabled });
    },
    onSuccess: (status) => {
      queryClient.setQueryData(
        contextEngineQueryKeys.feedbackLoop.schedule(aiIndexId ?? ''),
        status
      );
    },
    onError: (mutationError) => {
      const toastMessage = getErrorMessage(mutationError);
      notifications.toasts.addError(mutationError, {
        title: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.scheduleError', {
          defaultMessage: 'Unable to change the automatic analysis schedule',
        }),
        ...(toastMessage ? { toastMessage } : {}),
      });
    },
  });

  return {
    isEnabled: data?.enabled ?? false,
    isLoading,
    error: error ?? undefined,
    setEnabled: mutate,
    isSaving,
  };
};
