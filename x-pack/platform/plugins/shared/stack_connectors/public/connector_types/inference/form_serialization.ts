/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorFormSchema } from '@kbn/triggers-actions-ui-plugin/public';
import { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import type { InferenceConnectorProviderConfig } from '@kbn/triggers-actions-ui-plugin/public/application/sections/action_connector_form/types';

const MIN_ALLOCATIONS = 0;
const DEFAULT_NUM_THREADS = 1;

export const formSerializer = (data: ConnectorFormSchema) => {
  const { provider, providerConfig } = data.config || {};
  const serviceSettings =
    (providerConfig as InferenceConnectorProviderConfig)?.service_settings ?? {};
  const taskSettings = (providerConfig as InferenceConnectorProviderConfig)?.task_settings ?? {};

  const {
    max_number_of_allocations: maxAllocations,
    headers,
    max_tokens,
    ...restServiceSettings
  } = serviceSettings;

  if (data && (serviceSettings || taskSettings)) {
    const updatedData = {
      ...data,
      config: {
        ...data.config,
        providerConfig: {
          service_settings: {
            ...restServiceSettings,
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
          // NOTE: These updates to task_settings are a temporary workaround for anthropic max_tokens handling and any service with headers until the services endpoint is updated to include the 'location' field which indicates where the config fields go.
          // For max_tokens, anthropic is unique in that it requires max_tokens to be sent as part of the task_settings instead of the usual service_settings.
          // Until the services endpoint is updated to reflect that, there is no way for the form UI to know where to put max_tokens. This can be removed once that update is made.
          task_settings: {
            ...taskSettings,
            ...(headers ? { headers } : {}),
            ...(provider === ServiceProviderKeys.anthropic && serviceSettings?.max_tokens
              ? { max_tokens: serviceSettings.max_tokens }
              : {}),
          },
        },
      },
    };

    return updatedData;
  }

  return data;
};

// For older saved objects
//   (1) set providerConfig as service_settings,
//   (2) headers need to be moved from top level to service_settings
//   (3) max_number_of_allocations needs to be moved from adaptive_allocations to top level of service_settings and adaptive_allocations removed,
// For new saved objects
//   (1) headers moved from task_settings (correct spot) to service_settings
export const formDeserializer = (data: ConnectorFormSchema) => {
  const { providerConfig, ...restConfig } = data.config || {};
  const { headers, max_tokens, ...restTaskSettings } = providerConfig?.task_settings || {};
  const { max_number_of_allocations } =
    providerConfig?.service_settings?.adaptive_allocations || {};

  return {
    ...data,
    config: {
      ...restConfig,
      providerConfig: {
        service_settings: {
          ...(providerConfig?.service_settings ?? providerConfig),
          ...(max_number_of_allocations
            ? // remove the adaptive_allocations from the data config as form does not expect it
              {
                max_number_of_allocations,
                adaptive_allocations: undefined,
              }
            : {}),
          ...(headers ? { headers } : {}),
          // Until 'location' field changes are in, move max_tokens to service_settings as form expects it
          ...(max_tokens ? { max_tokens } : {}),
        },
        task_settings: restTaskSettings,
      },
    },
  };
};
