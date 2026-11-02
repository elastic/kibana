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
import {
  type SemanticInferenceFieldType,
  getDefaultStrategyForFieldType,
  getTaskTypesForFieldType,
} from '../application/components/mappings_editor/constants';

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
  fieldType: SemanticInferenceFieldType = 'semantic_text'
) => {
  const compatibleEndpoints = useMemo<CompatibleEndpointsData | undefined>(() => {
    if (endpointsLoading) {
      return;
    }
    const taskTypes = getTaskTypesForFieldType(fieldType);
    const defaultStrategy = getDefaultStrategyForFieldType(fieldType);

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

    let defaultInferenceId: string | undefined;

    if (defaultStrategy === 'priority_with_elser_fallback') {
      const availableDefaultEndpoints = defaultEndpointsPriorityList.filter((defaultEndpoint) =>
        endpoints?.some((endpoint) => endpoint.inference_id === defaultEndpoint)
      );
      defaultInferenceId =
        availableDefaultEndpoints.length > 0
          ? availableDefaultEndpoints[0]
          : defaultInferenceEndpoints.ELSER;
    } else {
      // first_compatible, if no compatible endpoints return undefined.
      const compatibleIds = new Set(endpointDefinitions.map((e) => e.inference_id));
      const priorityDefault = defaultEndpointsPriorityList.find((id) => compatibleIds.has(id));
      if (priorityDefault) {
        defaultInferenceId = priorityDefault;
      } else if (endpointDefinitions.length > 0) {
        defaultInferenceId = endpointDefinitions[0].inference_id;
      }
    }

    return {
      defaultInferenceId,
      endpointDefinitions,
    };
  }, [endpointsLoading, endpoints, fieldType]);

  return {
    compatibleEndpoints,
    isLoading: !compatibleEndpoints,
  };
};
