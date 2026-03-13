/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { SERVICE_PROVIDERS } from '@kbn/inference-endpoint-ui-common';
import type { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import { useQueryInferenceEndpoints } from './use_inference_endpoints';
import { getModelId } from '../utils/get_model_id';

export interface EndpointInfo {
  service: string;
  icon: string;
  label: string;
}

export type EndpointInfoMap = Map<string, EndpointInfo>;

export const useEndpointInfo = () => {
  const { data: inferenceEndpoints = [] } = useQueryInferenceEndpoints();

  const endpointInfoMap = useMemo<EndpointInfoMap>(
    () =>
      new Map(
        inferenceEndpoints.map((ep) => {
          const provider = SERVICE_PROVIDERS[ep.service as ServiceProviderKeys];
          return [
            ep.inference_id,
            {
              service: ep.service,
              icon: provider?.icon ?? 'compute',
              label: getModelId(ep) ?? ep.inference_id,
            },
          ] as const;
        })
      ),
    [inferenceEndpoints]
  );

  return { inferenceEndpoints, endpointInfoMap };
};
