/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

const COMPATIBLE_TASK_TYPES = ['text_embedding', 'sparse_embedding'] as const;
type CompatibleTaskType = (typeof COMPATIBLE_TASK_TYPES)[number];

interface EndpointDefinition {
  /** The inference id of the endpoint. */
  inference_id: string;
}
interface CompatibleEndpointsData {
  defaultInferenceId: string | undefined;
  endpointDefinitions: EndpointDefinition[] | undefined;
}

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
    let defaultInferenceId: string | undefined;
    const endpointDefinitions: EndpointDefinition[] = [];
    endpoints?.forEach((endpoint) => {
      // Skip incompatible endpoints
      if (!COMPATIBLE_TASK_TYPES.includes(endpoint.task_type as CompatibleTaskType)) {
        return;
      }
      const isElserInEis =
        endpoint.inference_id === defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID;

      if (isElserInEis) {
        // Prioritize elser in eis endpoint as default.
        defaultInferenceId = endpoint.inference_id;
      } else if (!defaultInferenceId) {
        // Otherwise use the first compatible endpoint as default.
        defaultInferenceId = endpoint.inference_id;
      }
      endpointDefinitions.push({
        inference_id: endpoint.inference_id,
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
