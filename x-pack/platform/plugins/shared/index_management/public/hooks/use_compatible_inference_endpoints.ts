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

const DEFAULT_COMPATIBLE_TASK_TYPES = ['text_embedding', 'sparse_embedding'] as const;

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
  endpointsLoading: boolean,
  taskTypes: readonly string[] = DEFAULT_COMPATIBLE_TASK_TYPES
) => {
  const compatibleEndpoints = useMemo<CompatibleEndpointsData | undefined>(() => {
    if (endpointsLoading) {
      return;
    }
    const endpointDefinitions: EndpointDefinition[] = [];
    endpoints?.forEach((endpoint) => {
      // Skip incompatible endpoints
      if (!taskTypes.includes(endpoint.task_type)) {
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
    const compatibleIds = new Set(endpointDefinitions.map((e) => e.inference_id));
    const priorityDefault = defaultEndpointsPriorityList.find((id) => compatibleIds.has(id));
    let defaultInferenceId: string | undefined;
    if (priorityDefault) {
      defaultInferenceId = priorityDefault;
    } else if (taskTypes.includes('sparse_embedding')) {
      // Preserve existing semantic_text behaviour: fall back to ELSER even if not in the list
      defaultInferenceId = defaultInferenceEndpoints.ELSER;
    } else if (endpointDefinitions.length > 0) {
      defaultInferenceId = endpointDefinitions[0].inference_id;
    }
    // else undefined — user must pick or create a compatible endpoint
    return {
      defaultInferenceId,
      endpointDefinitions,
    };
  }, [endpointsLoading, endpoints, taskTypes]);

  return {
    compatibleEndpoints,
    isLoading: !compatibleEndpoints,
  };
};
