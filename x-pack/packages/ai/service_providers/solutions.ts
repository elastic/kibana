/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceProviderID } from './id';

export type ProviderSolution = 'Observability' | 'Security' | 'Search';

// There are more service providers in @kbn/stack-connectors-plugin,
// but until we know which other logos or properties we'd like to migrate,
// we're only including those currently in use by the AI Assistant.

/**
 * Solutions in which AI Service Providers can be used, mapped by ID.
 */
export const SERVICE_PROVIDER_SOLUTIONS: Record<ServiceProviderID, readonly ProviderSolution[]> = {
  // 'alibabacloud-ai-search': ['Search'],
  bedrock: ['Observability', 'Security', 'Search'],
  // anthropic: ['Search'],
  // azureopenai: ['Observability', 'Security', 'Search'],
  // azureaistudio: ['Search'],
  // cohere: ['Search'],
  // elasticsearch: ['Search'],
  // elser: ['Search'],
  gemini: ['Observability', 'Security', 'Search'],
  // googleaistudio: ['Search'],
  // googlevertexai: ['Observability', 'Security', 'Search'],
  // hugging_face: ['Search'],
  // mistral: ['Search'],
  openai: ['Observability', 'Security', 'Search'],
  // watsonxai: ['Search'],
} as const;
