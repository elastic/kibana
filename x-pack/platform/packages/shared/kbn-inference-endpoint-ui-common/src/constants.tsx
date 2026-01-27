/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { DEFAULT_MODEL as BEDROCK_DEFAULT_MODEL } from '@kbn/connector-schemas/bedrock/constants';
import { DEFAULT_MODEL as GEMINI_DEFAULT_MODEL } from '@kbn/connector-schemas/gemini/constants';
import { DEFAULT_MODEL as OPENAI_DEFAULT_MODEL } from '@kbn/connector-schemas/openai/constants';
import { GEMINI, DOCUMENTATION_BASE as DOCUMENTATION } from './translations';
import { FieldType, type InternalOverrideFieldsType } from './types/types';

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
  groq = 'groq',
  hugging_face = 'hugging_face',
  jinaai = 'jinaai',
  mistral = 'mistral',
  openai = 'openai',
  voyageai = 'voyageai',
  watsonxai = 'watsonxai',
  ai21 = 'ai21',
  llama = 'llama',
  contextualai = 'contextualai',
}

export const GEMINI_REGION_DOC_LINK = (
  <EuiLink
    data-test-subj="gemini-vertexai-api-doc"
    href="https://cloud.google.com/vertex-ai/docs/reference/rest#rest_endpoints"
    external
    rel="noopener nofollow noreferrer"
  >
    {`${GEMINI} ${DOCUMENTATION}`}
  </EuiLink>
);

export const GEMINI_PROJECT_ID_DOC_LINK = (
  <EuiLink
    data-test-subj="gemini-api-doc"
    href="https://cloud.google.com/vertex-ai/docs/start/cloud-environment"
    external
    rel="noopener nofollow noreferrer"
  >
    {`${GEMINI} ${DOCUMENTATION}`}
  </EuiLink>
);

export const serviceProviderLinkComponents: Partial<
  Record<ServiceProviderKeys, Record<string, React.ReactNode>>
> = {
  [ServiceProviderKeys.googlevertexai]: {
    location: GEMINI_REGION_DOC_LINK,
    project_id: GEMINI_PROJECT_ID_DOC_LINK,
  },
};

export const DEFAULT_TASK_TYPE = 'completion';
export const CHAT_COMPLETION_TASK_TYPE = 'chat_completion';
export const internalProviderKeys: Array<ServiceProviderKeys | string> = [
  ServiceProviderKeys.elasticsearch,
];

export const MAX_NUMBER_OF_ALLOCATIONS = 'max_number_of_allocations';
export const CONTEXT_WINDOW_LENGTH = 'contextWindowLength';

// Default model mappings for each service provider using already defined constants
// Note: Only include providers that have a 'model_id' field for completion/chat tasks
export const DEFAULT_MODELS: Partial<Record<ServiceProviderKeys, string>> = {
  // Providers with connector schema constants
  [ServiceProviderKeys.openai]: OPENAI_DEFAULT_MODEL, // 'gpt-4.1'
  [ServiceProviderKeys.azureopenai]: OPENAI_DEFAULT_MODEL, // 'gpt-4.1'
  [ServiceProviderKeys.amazonbedrock]: BEDROCK_DEFAULT_MODEL, // 'us.anthropic.claude-sonnet-4-5-20250929-v1:0'
  [ServiceProviderKeys.googlevertexai]: GEMINI_DEFAULT_MODEL, // 'gemini-2.5-pro'
  [ServiceProviderKeys.googleaistudio]: GEMINI_DEFAULT_MODEL, // 'gemini-2.5-pro'

  // Major LLM providers with established default models
  [ServiceProviderKeys.anthropic]: 'claude-3-5-sonnet-20241022',
  [ServiceProviderKeys.cohere]: 'command-r-plus',
  [ServiceProviderKeys.mistral]: 'mistral-large-latest',
  [ServiceProviderKeys.azureaistudio]: OPENAI_DEFAULT_MODEL, // 'gpt-4.1' - similar to Azure OpenAI
  [ServiceProviderKeys.groq]: 'llama-3.3-70b-versatile',
  [ServiceProviderKeys.deepseek]: 'deepseek-chat',

  // Additional providers with model_id field for completion/chat
  [ServiceProviderKeys.ai21]: 'jamba-1.5-large', // AI21's latest Jamba model
  [ServiceProviderKeys.watsonxai]: 'ibm/granite-13b-chat-v2', // IBM watsonx default
  [ServiceProviderKeys.llama]: 'meta-llama/Llama-3.3-70B-Instruct', // Meta Llama Stack
  [ServiceProviderKeys.contextualai]: 'contextual-ai/rag-1', // Contextual AI default

  // Embedding service providers with model_id field
  [ServiceProviderKeys.jinaai]: 'jina-embeddings-v3', // Jina AI's default embedding model
  [ServiceProviderKeys.voyageai]: 'voyage-4', // Voyage AI's latest default embedding model
  [ServiceProviderKeys.elasticsearch]: '.elser_model_2', // Elasticsearch default (also set in provider config)
};

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
          updatable: true,
        },
      },
    ],
    serverlessOnly: true,
  },
};
