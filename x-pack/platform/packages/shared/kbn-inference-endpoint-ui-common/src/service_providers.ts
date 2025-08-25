/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

interface ServiceProviderRecord {
  name: string;
  solutions: ProviderSolution[];
}

export type ProviderSolution = 'Observability' | 'Security' | 'Search';

export const SERVICE_PROVIDERS: Record<ServiceProviderKeys, ServiceProviderRecord> = {
  [ServiceProviderKeys.amazonbedrock]: {
    name: 'Amazon Bedrock',
    solutions: ['Observability', 'Security', 'Search'],
  },
  [ServiceProviderKeys.amazon_sagemaker]: {
    name: 'Amazon SageMaker',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.azureaistudio]: {
    name: 'Azure AI Studio',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.azureopenai]: {
    name: 'Azure OpenAI',
    solutions: ['Observability', 'Security', 'Search'],
  },
  [ServiceProviderKeys.anthropic]: {
    name: 'Anthropic',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.cohere]: {
    name: 'Cohere',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.elasticsearch]: {
    name: 'Elasticsearch',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.elastic]: {
    name: 'Elastic',
    solutions: ['Observability', 'Security', 'Search'],
  },
  [ServiceProviderKeys.googleaistudio]: {
    name: 'Google AI Studio',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.googlevertexai]: {
    name: 'Google Vertex AI',
    solutions: ['Observability', 'Security', 'Search'],
  },
  [ServiceProviderKeys.hugging_face]: {
    name: 'Hugging Face',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.mistral]: {
    name: 'Mistral',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.openai]: {
    name: 'OpenAI',
    solutions: ['Observability', 'Security', 'Search'],
  },
  [ServiceProviderKeys['alibabacloud-ai-search']]: {
    name: 'AlibabaCloud AI Search',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.watsonxai]: {
    name: 'IBM Watsonx',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.jinaai]: {
    name: 'Jina AI',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.voyageai]: {
    name: 'Voyage AI',
    solutions: ['Search'],
  },
  [ServiceProviderKeys.deepseek]: {
    name: 'DeepSeek',
    solutions: ['Search'],
  },
};
