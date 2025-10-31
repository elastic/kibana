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
  if (data && providerConfig?.max_number_of_allocations != null) {
    const { max_number_of_allocations: maxAllocations, ...restProviderConfig } = providerConfig;

    return {
      ...data,
      config: {
        ...data.config,
        providerConfig: {
          ...restProviderConfig,
          adaptive_allocations: {
            enabled: true,
            min_number_of_allocations: MIN_ALLOCATIONS,
            max_number_of_allocations: maxAllocations,
          },
          // Temporary solution until the endpoint is updated to no longer require it and to set its own default for this value
          num_threads: DEFAULT_NUM_THREADS,
        },
      },
    };
  }
  return data;
};

export const formDeserializer = (data: ConnectorFormSchema) => {
  const providerConfig = data.config?.providerConfig as
    | InferenceConnectorProviderConfig
    | undefined;
  if (data && providerConfig?.adaptive_allocations?.max_number_of_allocations != null) {
    return {
      ...data,
      config: {
        ...data.config,
        providerConfig: {
          ...providerConfig,
          max_number_of_allocations: providerConfig.adaptive_allocations.max_number_of_allocations,
          // remove the adaptive_allocations from the data config as form does not expect it
          adaptive_allocations: undefined,
        },
      },
    };
  }
  return data;
};
