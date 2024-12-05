/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ServiceProviderID = (typeof SERVICE_PROVIDER_IDS)[number];

// There are more service providers in @kbn/stack-connectors-plugin, but until
// we know which other logos or properties we'd like to migrate, we're only
// including those currently in use by the AI Assistant.

/**
 * Available AI Service Provider IDs.
 */
export const SERVICE_PROVIDER_IDS = [
  // 'alibabacloud-ai-search',
  'bedrock',
  // 'anthropic',
  // 'azureopenai',
  // 'azureaistudio',
  // 'cohere',
  // 'elasticsearch',
  // 'elser',
  'gemini',
  // 'googleaistudio',
  // 'googlevertexai',
  // 'hugging_face',
  // 'mistral',
  'openai',
  // 'watsonxai',
] as const;
