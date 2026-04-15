/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import {
  reanalyzeDataStream,
  type ReanalyzeDataStreamRequest,
  type ReanalyzeDataStreamResponse,
} from '../lib/api';
import { useKibana } from './use_kibana';
import * as i18n from './translations';

export interface UseReanalyzeDataStreamResult {
  reanalyzeDataStreamMutation: ReturnType<
    typeof useMutation<ReanalyzeDataStreamResponse, Error, ReanalyzeDataStreamRequest>
  >;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to re-run the analysis workflow for an existing data stream and sample upload.
 * Statuses are restarted and picked up by the analysis workflow.
 */
export function useReanalyzeDataStream(): UseReanalyzeDataStreamResult {
  const { http, notifications } = useKibana().services;
  const queryClient = useQueryClient();

  const mutation = useMutation<ReanalyzeDataStreamResponse, Error, ReanalyzeDataStreamRequest>({
    mutationFn: async (request: ReanalyzeDataStreamRequest) => {
      return reanalyzeDataStream({ http, ...request });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integration', variables.integrationId] });

      notifications.toasts.addSuccess({
        title: i18n.REANALYZE_DATA_STREAM_SUCCESS,
      });
    },
    onError: (error) => {
      notifications.toasts.addError(error, {
        title: i18n.REANALYZE_DATA_STREAM_ERROR,
      });
    },
  });

  return {
    reanalyzeDataStreamMutation: mutation,
    isLoading: mutation.isLoading,
    error: mutation.error,
  };
}
