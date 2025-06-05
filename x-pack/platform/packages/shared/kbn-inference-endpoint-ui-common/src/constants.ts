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
export const MIN_ALLOCATIONS = 0;

type ServiceProviderKeysType = keyof typeof ServiceProviderKeys;
type InternalOverrideFieldsType = {
  [Key in ServiceProviderKeysType | string]?: {
    hidden: string[];
    additional: FieldsConfiguration[];
  };
};

// This is a temporaray solution to handle the internal overrides for field configurations that have not been updated in the services endpoint
export const INTERNAL_OVERRIDE_FIELDS: InternalOverrideFieldsType = {
  [ServiceProviderKeys.elasticsearch]: {
    hidden: ['num_allocations', 'num_threads'],
    additional: [
      {
        max_number_of_allocations: {
          default_value: 32,
          description: 'Maximum number of allocations for the inference endpoint.',
          label: 'Max Allocations',
          required: true,
          sensitive: false,
          supported_task_types: ['text_embedding', 'sparse_embedding', 'rerank'],
          type: FieldType.INTEGER,
          updatable: true,
        },
      },
    ],
  },
};

export const DEFAULT_VALUES = {
  [ServiceProviderKeys.elasticsearch]: { num_allocations: 1, num_threads: 16 },
};
