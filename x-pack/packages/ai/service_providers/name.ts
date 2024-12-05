/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceProviderID } from './id';

// There are more service providers in @kbn/stack-connectors-plugin,
// but until we know which other logos or properties we'd like to migrate,
// we're only including those currently in use by the AI Assistant.

/**
 * Display names for AI Service Providers, mapped by ID.
 */
export const SERVICE_PROVIDER_NAMES: Record<ServiceProviderID, string> = {
  // 'alibabacloud-ai-search': 'Alibaba Cloud AI Search',
  bedrock: 'Bedrock',
  // anthropic: 'Anthropic',
  // azureopenai: 'Azure OpenAI',
  // azureaistudio: 'Azure AI Studio',
  // cohere: 'Cohere',
  // elasticsearch: 'Elasticsearch',
  // elser: 'Elasticsearch',
  gemini: 'Gemini',
  // googleaistudio: 'Google AI Studio',
  // googlevertexai: 'Google Vertex AI',
  // hugging_face: 'Hugging Face',
  // mistral: 'Mistral',
  openai: 'OpenAI',
  // watsonxai: 'Watson XAI',
};
