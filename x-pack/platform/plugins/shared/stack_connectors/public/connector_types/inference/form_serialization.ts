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
  const { service_settings, ...restConfig } = data.config || {};
  if (data && service_settings) {
    const {
      max_number_of_allocations,
      // Remove headers from service_settings, as it should be in task_settings - can remove once location changes are in.
      headers: nullHeaders,
      ...restServiceSettings
    } = service_settings || {};

    return {
      ...data,
      config: {
        ...restConfig,
        service_settings: {
          ...restServiceSettings,
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

// Check if previous format with 'providerConfig', otherwise the only change is moving max_number_of_allocations into service_settings.
export const formDeserializer = (data: ConnectorFormSchema) => {
  const { providerConfig, headers, service_settings, task_settings, ...restConfig } =
    data.config || {};

  if (providerConfig) {
    const { adaptive_allocations, max_tokens, ...restProviderConfig } =
      providerConfig as InferenceConnectorProviderConfig;
    const maxAllocations = adaptive_allocations?.max_number_of_allocations;

    return {
      ...data,
      config: {
        ...restConfig,
        service_settings: {
          ...restProviderConfig,
          ...(maxAllocations ? { max_number_of_allocations: maxAllocations } : {}),
        },
        task_settings: {
          ...(headers ? { headers } : {}),
          ...(max_tokens ? { max_tokens } : {}),
        },
      },
    };
  }

  const { adaptive_allocations, ...restServiceSettings } = service_settings ?? {};
  const maxAllocations = adaptive_allocations?.max_number_of_allocations;

  const reformatted = {
    ...data,
    config: {
      ...restConfig,
      service_settings: {
        ...restServiceSettings,
        ...(maxAllocations ? { max_number_of_allocations: maxAllocations } : {}),
      },
      task_settings,
    },
  };

  return reformatted;
};
