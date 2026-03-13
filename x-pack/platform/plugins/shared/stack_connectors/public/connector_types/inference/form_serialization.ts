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

// Form overrides handle correct location for 'max_tokens' and 'headers' so we only handle adaptive_allocations.
export const formSerializer = (data: ConnectorFormSchema) => {
  const { providerConfig, ...restConfig } = data.config || {};
  if (data && providerConfig) {
    const { max_number_of_allocations, ...restProviderConfig } =
      (providerConfig as InferenceConnectorProviderConfig) || {};

    return {
      ...data,
      config: {
        ...restConfig,
        providerConfig: {
          ...restProviderConfig,
          ...(max_number_of_allocations
            ? {
                adaptive_allocations: {
                  enabled: true,
                  min_number_of_allocations: MIN_ALLOCATIONS,
                  ...(max_number_of_allocations ? { max_number_of_allocations } : {}),
                },
                // Temporary solution until the endpoint is updated to no longer require it and to set its own default for this value
                num_threads: DEFAULT_NUM_THREADS,
              }
            : {}),
        },
      },
    };
  }
  return data;
};

export const formDeserializer = (data: ConnectorFormSchema) => {
  const { providerConfig, taskTypeConfig, headers, ...restConfig } = data.config || {};

  if (providerConfig) {
    const { adaptive_allocations, max_tokens, ...restProviderConfig } =
      providerConfig as InferenceConnectorProviderConfig;
    const maxAllocations = adaptive_allocations?.max_number_of_allocations;

    return {
      ...data,
      config: {
        ...restConfig,
        providerConfig: {
          ...restProviderConfig,
          ...(maxAllocations ? { max_number_of_allocations: maxAllocations } : {}),
        },
        taskTypeConfig: {
          ...(taskTypeConfig ? { ...taskTypeConfig } : {}),
          ...(headers ? { headers } : {}),
          ...(max_tokens ? { max_tokens } : {}),
        },
      },
    };
  }

  return data;
};
