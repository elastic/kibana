/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { SERVICE_PROVIDERS } from '@kbn/inference-endpoint-ui-common';

const COMPATIBLE_TASK_TYPES = ['text_embedding', 'sparse_embedding'] as const;
type CompatibleTaskType = (typeof COMPATIBLE_TASK_TYPES)[number];

interface EndpointDefinition {
  /** The inference id of the endpoint. */
  inference_id: string;
  description: string;
}
interface CompatibleEndpointsData {
  defaultInferenceId: string | undefined;
  endpointDefinitions: EndpointDefinition[] | undefined;
}

const defaultEndpointsPriorityList = [
  defaultInferenceEndpoints.JINAv5,
  defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
  defaultInferenceEndpoints.ELSER,
  defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL,
];

/**
 * Transforms the inference endpoints into a format that can be used to build the selectable options for the inference endpoint dropdown.
 *
 * Remains in loading state until the endpoints are loaded.
 */
export const useCompatibleInferenceEndpoints = (
  endpoints: InferenceAPIConfigResponse[] | null | undefined,
  endpointsLoading: boolean
) => {
  const compatibleEndpoints = useMemo<CompatibleEndpointsData | undefined>(() => {
    if (endpointsLoading) {
      return;
    }
    const availableDefaultEndpoints = defaultEndpointsPriorityList.filter((defaultEndpoint) =>
      endpoints?.some((endpoint) => endpoint.inference_id === defaultEndpoint)
    );
    // If no compatible endpoints are found, default to the ELSER endpoint which is always available
    const defaultInferenceId =
      availableDefaultEndpoints.length > 0
        ? availableDefaultEndpoints[0]
        : defaultInferenceEndpoints.ELSER;
    const endpointDefinitions: EndpointDefinition[] = [];
    endpoints?.forEach((endpoint) => {
      // Skip incompatible endpoints
      if (!COMPATIBLE_TASK_TYPES.includes(endpoint.task_type as CompatibleTaskType)) {
        return;
      }
      const provider = SERVICE_PROVIDERS[endpoint.service];
      const modelId = endpoint.service_settings.model_id ?? endpoint.service_settings.model;
      const service = provider?.name ?? endpoint.service;
      const description = modelId ? `${service} - ${modelId}` : service;

      endpointDefinitions.push({
        inference_id: endpoint.inference_id,
        description,
      });
    });
    return {
      defaultInferenceId,
      endpointDefinitions,
    };
  }, [endpointsLoading, endpoints]);

  return {
    compatibleEndpoints,
    isLoading: !compatibleEndpoints,
  };
};
