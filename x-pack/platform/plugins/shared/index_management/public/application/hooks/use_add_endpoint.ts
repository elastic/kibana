/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import { InferenceEndpoint } from '@kbn/inference-endpoint-ui-common';
import { useMLModelNotificationToasts } from '../../hooks/use_ml_model_status_toasts';
import { createInferenceEndpoint } from '../services';

export const useAddEndpoint = () => {
  const { showInferenceCreationErrorToasts, showInferenceSuccessToast } =
    useMLModelNotificationToasts();

  const addInferenceEndpoint = useCallback(
    async (
      inferenceEndpoint: InferenceEndpoint,
      onSuccess?: (inferenceId: string) => void,
      onError?: () => void
    ) => {
      const { error } = await createInferenceEndpoint(
        inferenceEndpoint.config.taskType,
        inferenceEndpoint.config.inferenceId,
        inferenceEndpoint
      );

      if (error) {
        showInferenceCreationErrorToasts(error?.message);
        if (onError) {
          onError();
        }
      } else {
        showInferenceSuccessToast();
        if (onSuccess) {
          onSuccess(inferenceEndpoint.config.inferenceId);
        }
      }
    },
    [showInferenceCreationErrorToasts, showInferenceSuccessToast]
  );

  return {
    addInferenceEndpoint,
  };
};
