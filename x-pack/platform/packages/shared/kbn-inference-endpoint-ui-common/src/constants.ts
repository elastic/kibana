/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ServiceProviderKeys {
  amazonbedrock = 'amazonbedrock',
  azureopenai = 'azureopenai',
  azureaistudio = 'azureaistudio',
  cohere = 'cohere',
  elasticsearch = 'elasticsearch',
  elastic = 'elastic',
  googleaistudio = 'googleaistudio',
  googlevertexai = 'googlevertexai',
  hugging_face = 'hugging_face',
  mistral = 'mistral',
  openai = 'openai',
  anthropic = 'anthropic',
  watsonxai = 'watsonxai',
  'alibabacloud-ai-search' = 'alibabacloud-ai-search',
  jinaai = 'jinaai',
}

export const DEFAULT_TASK_TYPE = 'completion';
