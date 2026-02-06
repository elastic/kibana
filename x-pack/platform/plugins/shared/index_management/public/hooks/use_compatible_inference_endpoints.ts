/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { LicenseType } from '@kbn/licensing-types';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { SERVICE_PROVIDERS } from '@kbn/inference-endpoint-ui-common';
import { useLicense } from './use_license';

const COMPATIBLE_TASK_TYPES = ['text_embedding', 'sparse_embedding'] as const;
type CompatibleTaskType = (typeof COMPATIBLE_TASK_TYPES)[number];

const LICENSE_TIER_ENTERPRISE = 'enterprise';
const LICENSE_TIER_PLATINUM = 'platinum';
const INFERENCE_ENDPOINT_LICENSE_MAP: Record<string, LicenseType> = {
  [defaultInferenceEndpoints.ELSER]: LICENSE_TIER_PLATINUM,
  [defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID]: LICENSE_TIER_ENTERPRISE,
};

interface EndpointDefinition {
  /** The inference id of the endpoint. */
  inference_id: string;
  /** The license requirement for the endpoint. */
  requiredLicense: string | undefined;
  /** Whether the endpoint is accessible to the current license. Defaults to true if no license requirement is specified. */
  accessible: boolean;
  description: string;
}
interface CompatibleEndpointsData {
  defaultInferenceId: string | undefined;
  endpointDefinitions: EndpointDefinition[] | undefined;
}

/**
 * Transforms the inference endpoints into a format that can be used to build the selectable options for the inference endpoint dropdown.
 *
 * Remains in loading state until the endpoints and license are loaded.
 */
export const useCompatibleInferenceEndpoints = (
  endpoints: InferenceAPIConfigResponse[] | null | undefined,
  endpointsLoading: boolean
) => {
  const { isLoading: licenseLoading, isAtLeast } = useLicense();

  const compatibleEndpoints = useMemo<CompatibleEndpointsData | undefined>(() => {
    if (endpointsLoading || licenseLoading) {
      return;
    }
    let defaultInferenceId: string | undefined;
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

      const isElserInEis =
        endpoint.inference_id === defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID;
      const requiredLicense = INFERENCE_ENDPOINT_LICENSE_MAP[endpoint.inference_id];
      // If no license requirement is specified, assume access is granted.
      const accessible = requiredLicense ? isAtLeast(requiredLicense) : true;
      if (accessible) {
        if (isElserInEis) {
          // Prioritize elser in eis endpoint as default.
          defaultInferenceId = endpoint.inference_id;
        } else if (!defaultInferenceId) {
          // Otherwise use the first accessible endpoint as default.
          defaultInferenceId = endpoint.inference_id;
        }
      }

      endpointDefinitions.push({
        inference_id: endpoint.inference_id,
        requiredLicense,
        accessible,
        description,
      });
    });
    return {
      defaultInferenceId,
      endpointDefinitions,
    };
  }, [endpointsLoading, licenseLoading, endpoints, isAtLeast]);

  return {
    compatibleEndpoints,
    isLoading: !compatibleEndpoints,
  };
};
