/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ServiceProviderKeys {
  'alibabacloud-ai-search' = 'alibabacloud-ai-search',
  amazonbedrock = 'amazonbedrock',
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
