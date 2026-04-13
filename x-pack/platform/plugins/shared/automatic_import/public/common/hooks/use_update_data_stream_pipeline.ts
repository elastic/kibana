/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { GetDataStreamResultsResponse, UpdateDataStreamPipelineRequest } from '../lib/api';
import { updateDataStreamPipeline } from '../lib/api';
import { useKibana } from './use_kibana';
import * as i18n from './translations';

interface HttpErrorLike {
  message?: string;
  body?: {
    message?: string;
  };
}

const getPipelineSaveErrorMessage = (error: unknown): string => {
  const errorLike = error as HttpErrorLike;
  return errorLike.body?.message ?? errorLike.message ?? i18n.SAVE_PIPELINE_ERROR;
};

export interface UseUpdateDataStreamPipelineResult {
  updateDataStreamPipelineMutation: ReturnType<
    typeof useMutation<GetDataStreamResultsResponse, Error, UpdateDataStreamPipelineRequest>
  >;
  isLoading: boolean;
  error: Error | null;
}

export function useUpdateDataStreamPipeline(): UseUpdateDataStreamPipelineResult {
  const { http, notifications } = useKibana().services;
  const queryClient = useQueryClient();

  const mutation = useMutation<
    GetDataStreamResultsResponse,
    Error,
    UpdateDataStreamPipelineRequest
  >({
    mutationFn: async (request: UpdateDataStreamPipelineRequest) => {
      try {
        return await updateDataStreamPipeline({ http, ...request });
      } catch (error) {
        throw new Error(getPipelineSaveErrorMessage(error));
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['dataStreamResults', variables.integrationId, variables.dataStreamId],
      });

      notifications.toasts.addSuccess({
        title: i18n.SAVE_PIPELINE_SUCCESS,
      });
    },
    onError: (error) => {
      notifications.toasts.addDanger({
        title: i18n.SAVE_PIPELINE_ERROR,
        text: getPipelineSaveErrorMessage(error),
      });
    },
  });

  return {
    updateDataStreamPipelineMutation: mutation,
    isLoading: mutation.isLoading,
    error: mutation.error,
  };
}
