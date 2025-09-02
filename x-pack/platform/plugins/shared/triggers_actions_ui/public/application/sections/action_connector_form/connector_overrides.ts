/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorFormSchema, InferenceConnectorProviderConfig } from './types';

const MIN_ALLOCATIONS = 0;
const DEFAULT_NUM_THREADS = 1;

// TODO remove when https://github.com/elastic/kibana/issues/231016 is resolved
export const connectorOverrides = (connectorId: string) => {
  switch (connectorId) {
    case '.inference':
      // explicit check to see if this field exists as it only exists in serverless
      const formSerializer = (data: ConnectorFormSchema) => {
        if (
          data &&
          (data.config?.providerConfig as InferenceConnectorProviderConfig)
            ?.max_number_of_allocations !== undefined
        ) {
          const providerConfig = data.config?.providerConfig as InferenceConnectorProviderConfig;
          const { max_number_of_allocations: maxAllocations, ...restProviderConfig } =
            providerConfig || {};

          return {
            ...data,
            config: {
              ...data.config,
              providerConfig: {
                ...restProviderConfig,
                adaptive_allocations: {
                  enabled: true,
                  min_number_of_allocations: MIN_ALLOCATIONS,
                  ...(maxAllocations ? { max_number_of_allocations: maxAllocations } : {}),
                },
                // Temporary solution until the endpoint is updated to no longer require it and to set its own default for this value
                num_threads: DEFAULT_NUM_THREADS,
              },
            },
          };
        }
        return data;
      };

      const formDeserializer = (data: ConnectorFormSchema) => {
        if (
          data &&
          (data.config?.providerConfig as InferenceConnectorProviderConfig)?.adaptive_allocations
            ?.max_number_of_allocations
        ) {
          return {
            ...data,
            config: {
              ...data.config,
              providerConfig: {
                ...(data.config.providerConfig as InferenceConnectorProviderConfig),
                max_number_of_allocations: (
                  data.config.providerConfig as InferenceConnectorProviderConfig
                ).adaptive_allocations?.max_number_of_allocations,
                // remove the adaptive_allocations from the data config as form does not expect it
                adaptive_allocations: undefined,
              },
            },
          };
        }
        return data;
      };

      return {
        formDeserializer,
        formSerializer,
        shouldHideConnectorSettingsTitle: true,
      };
  }
};
