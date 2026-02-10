/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorFormSchema } from '@kbn/triggers-actions-ui-plugin/public';
import type { InferenceConnectorProviderConfig } from '@kbn/triggers-actions-ui-plugin/public/application/sections/action_connector_form/types';

const MIN_ALLOCATIONS = 0;
const DEFAULT_NUM_THREADS = 1;

export const formSerializer = (data: ConnectorFormSchema) => {
  const providerConfig = data.config?.providerConfig as
    | InferenceConnectorProviderConfig
    | undefined;
  if (data && providerConfig) {
    const {
      max_number_of_allocations: maxAllocations,
      headers,
      ...restProviderConfig
    } = providerConfig || {};

    return {
      ...data,
      config: {
        ...data.config,
        providerConfig: {
          ...restProviderConfig,
          ...(maxAllocations
            ? {
                adaptive_allocations: {
                  enabled: true,
                  min_number_of_allocations: MIN_ALLOCATIONS,
                  ...(maxAllocations ? { max_number_of_allocations: maxAllocations } : {}),
                },
                // Temporary solution until the endpoint is updated to no longer require it and to set its own default for this value
                num_threads: DEFAULT_NUM_THREADS,
              }
            : {}),
        },
        ...(headers ? { headers } : {}),
      },
    };
  }
  return data;
};

export const formDeserializer = (data: ConnectorFormSchema) => {
  if (
    (data.config?.providerConfig as InferenceConnectorProviderConfig | undefined)
      ?.adaptive_allocations?.max_number_of_allocations ||
    data.config?.headers
  ) {
    const { headers, ...restConfig } = data.config;
    const maxAllocations = (
      data.config.providerConfig as InferenceConnectorProviderConfig | undefined
    )?.adaptive_allocations?.max_number_of_allocations;

    return {
      ...data,
      config: {
        ...restConfig,
        providerConfig: {
          ...(data.config.providerConfig as InferenceConnectorProviderConfig),
          ...(headers ? { headers } : {}),
          ...(maxAllocations
            ? // remove the adaptive_allocations from the data config as form does not expect it
              { max_number_of_allocations: maxAllocations, adaptive_allocations: undefined }
            : {}),
        },
      },
    };
  }

  return data;
};
