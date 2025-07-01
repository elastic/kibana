/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldsConfiguration } from './types/types';
import { FieldType } from './types/types';

export enum ServiceProviderKeys {
  'alibabacloud-ai-search' = 'alibabacloud-ai-search',
  amazonbedrock = 'amazonbedrock',
  'amazon_sagemaker' = 'amazon_sagemaker',
  anthropic = 'anthropic',
  azureaistudio = 'azureaistudio',
  azureopenai = 'azureopenai',
  cohere = 'cohere',
  deepseek = 'deepseek',
  elastic = 'elastic',
  elasticsearch = 'elasticsearch',
  googleaistudio = 'googleaistudio',
  googlevertexai = 'googlevertexai',
  hugging_face = 'hugging_face',
  jinaai = 'jinaai',
  mistral = 'mistral',
  openai = 'openai',
  voyageai = 'voyageai',
  watsonxai = 'watsonxai',
}

export const DEFAULT_TASK_TYPE = 'completion';
export const internalProviderKeys: Array<ServiceProviderKeys | string> = [
  ServiceProviderKeys.elasticsearch,
];

type ServiceProviderKeysType = keyof typeof ServiceProviderKeys;
type InternalOverrideFieldsType = {
  [Key in ServiceProviderKeysType | string]?: {
    hidden: string[];
    additional: FieldsConfiguration[];
  };
};

export const MAX_NUMBER_OF_ALLOCATIONS = 'max_number_of_allocations';

// This is a temporaray solution to handle the internal overrides for field configurations that have not been updated in the services endpoint
export const INTERNAL_OVERRIDE_FIELDS: InternalOverrideFieldsType = {
  [ServiceProviderKeys.elasticsearch]: {
    hidden: ['num_allocations', 'num_threads'],
    additional: [
      {
        [MAX_NUMBER_OF_ALLOCATIONS]: {
          default_value: null,
          description:
            'Maximum scaling limit available to the endpoint. Max allocations will determine the maximum number of VCUs that the endpoint can scale up to.',
          label: 'Max scaling limit (allocations)',
          required: false,
          sensitive: false,
          supported_task_types: ['text_embedding', 'sparse_embedding', 'rerank'],
          type: FieldType.INTEGER,
          updatable: false,
        },
      },
    ],
  },
};
