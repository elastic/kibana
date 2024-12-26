/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useKibana } from '..';
import { InferenceEndpoint } from '../../../common/types/inference';
import { useMLModelNotificationToasts } from '../../hooks/use_ml_model_status_toasts';
import { createInferenceEndpoint } from '../services';

export const useAddEndpoint = (onSuccess?: () => void, onError?: () => void) => {
  const { services } = useKibana();
  const toasts = services.notifications?.toasts;
  const { showErrorToasts, showInferenceSuccessToast } = useMLModelNotificationToasts();

  const addInferenceEndpoint = useCallback(
    async (inferenceEndpoint: InferenceEndpoint) => {
      const { error } = await createInferenceEndpoint(
        inferenceEndpoint.config.taskType,
        inferenceEndpoint.config.inferenceId,
        inferenceEndpoint
      );

      if (error) {
        showErrorToasts(error?.message, 'Endpoint creation failed');
        if (onError) {
          onError();
        }
      } else {
        showInferenceSuccessToast();
        if (onSuccess) {
          onSuccess();
        }
      }
    },
    [onError, onSuccess, showErrorToasts, showInferenceSuccessToast]
  );

  return {
    addInferenceEndpoint,
  };
};
