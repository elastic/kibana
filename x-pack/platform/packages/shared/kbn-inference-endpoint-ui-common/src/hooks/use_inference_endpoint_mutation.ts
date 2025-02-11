/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { useMutation } from '@tanstack/react-query';
import { KibanaServerError } from '@kbn/kibana-utils-plugin/common';
import { IToasts } from '@kbn/core/public';
import { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import * as i18n from '../translations';
import { INFERENCE_ENDPOINT_INTERNAL_API_VERSION, InferenceEndpoint } from '../types/types';

export const addInferenceEndpoint = async (
  http: HttpSetup,
  inferenceEndpoint: InferenceEndpoint
): Promise<InferenceInferenceEndpointInfo> => {
  return await http.post(`/internal/_inference/_add`, {
    body: JSON.stringify(inferenceEndpoint),
    version: INFERENCE_ENDPOINT_INTERNAL_API_VERSION,
  });
};

export const updateInferenceEndpoint = async (
  http: HttpSetup,
  inferenceEndpoint: InferenceEndpoint
): Promise<InferenceInferenceEndpointInfo> => {
  return await http.put(`/internal/_inference/_update`, {
    body: JSON.stringify(inferenceEndpoint),
    version: INFERENCE_ENDPOINT_INTERNAL_API_VERSION,
  });
};

export const useInferenceEndpointMutation = (
  http: HttpSetup,
  toasts: IToasts,
  onSuccessCallback?: (inferenceId: string) => void
) => {
  const addMutation = useMutation(
    ['inference-endpoint', 'add'],
    (endpointData: InferenceEndpoint) => addInferenceEndpoint(http, endpointData),
    {
      onError: (error: { body: KibanaServerError }) => {
        toasts?.addError(new Error(error.body.message), {
          title: i18n.ENDPOINT_CREATION_FAILED,
          toastMessage: error.body.message,
        });
      },
      onSuccess: (response: InferenceInferenceEndpointInfo) => {
        toasts?.addSuccess({
          title: i18n.ENDPOINT_ADDED_SUCCESS,
        });
        onSuccessCallback?.(response.inference_id);
      },
    }
  );

  const editMutation = useMutation(
    ['inference-endpoint', 'edit'],
    (endpointData: InferenceEndpoint) => updateInferenceEndpoint(http, endpointData),
    {
      onError: (error: { body: KibanaServerError }) => {
        toasts?.addError(new Error(error.body.message), {
          title: i18n.ENDPOINT_UPDATE_FAILED,
          toastMessage: error.body.message,
        });
      },
      onSuccess: (response: InferenceInferenceEndpointInfo) => {
        toasts?.addSuccess({
          title: i18n.ENDPOINT_UPDATE_SUCCESS,
        });
        onSuccessCallback?.(response.inference_id);
      },
    }
  );

  return {
    isLoading: addMutation.isLoading || editMutation.isLoading,
    mutate: (data: InferenceEndpoint, isEditing: boolean) => {
      if (isEditing) {
        editMutation.mutate(data);
      } else {
        addMutation.mutate(data);
      }
    },
  };
};
