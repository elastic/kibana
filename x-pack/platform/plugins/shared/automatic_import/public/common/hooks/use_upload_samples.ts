/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { UploadSamplesToDataStreamResponse } from '../../../common/model/api/data_streams/data_stream.gen';
import { uploadSamplesToDataStream, type UploadSamplesRequest } from '../lib/api';
import { useKibana } from './use_kibana';
import * as i18n from './translations';

export interface UseUploadSamplesResult {
  uploadSamplesMutation: ReturnType<
    typeof useMutation<UploadSamplesToDataStreamResponse, Error, UploadSamplesRequest>
  >;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to upload log samples to a data stream before triggering analysis.
 * Uses React Query for mutation management.
 * This should be called before the form is submitted to upload samples
 * that will be available for the "Analyze Logs" button.
 */
export function useUploadSamples(): UseUploadSamplesResult {
  const { http, notifications } = useKibana().services;

  const mutation = useMutation<UploadSamplesToDataStreamResponse, Error, UploadSamplesRequest>({
    mutationFn: async (request: UploadSamplesRequest) => {
      return uploadSamplesToDataStream({ http, ...request });
    },
    onSuccess: () => {
      notifications.toasts.addSuccess({
        title: i18n.UPLOAD_SAMPLES_SUCCESS,
      });
    },
    onError: (error) => {
      notifications.toasts.addError(error, {
        title: i18n.UPLOAD_SAMPLES_ERROR,
      });
    },
  });

  return {
    uploadSamplesMutation: mutation,
    isLoading: mutation.isLoading,
    error: mutation.error,
  };
}
