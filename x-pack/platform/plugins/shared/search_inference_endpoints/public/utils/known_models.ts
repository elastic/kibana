/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ELASTIC_GROUP_ID = 'Elastic';

export interface KnownModelGroup {
  groupId: string;
  groupLabel: string;
  groupTest: (modelId: string) => boolean;
}

export const KNOWN_MODEL_GROUPS: KnownModelGroup[] = [
  {
    groupId: ELASTIC_GROUP_ID,
    groupLabel: 'Elastic',
    groupTest: (modelId: string) => {
      const normalizedModelId = modelId.toLowerCase();
      return normalizedModelId.includes('elser_model') || normalizedModelId.includes('.rerank-v1');
    },
  },
  {
    groupId: 'Anthropic',
    groupLabel: 'Anthropic',
    groupTest: (modelId: string) => {
      const normalizedModelId = modelId.toLowerCase();
      return normalizedModelId.includes('claude') || normalizedModelId.includes('anthropic');
    },
  },
  {
    groupId: 'Google',
    groupLabel: 'Google',
    groupTest: (modelId: string) => {
      const normalizedModelId = modelId.toLowerCase();
      return (
        normalizedModelId.includes('google-gemini') ||
        normalizedModelId.includes('google') ||
        normalizedModelId.includes('gemini')
      );
    },
  },
  {
    groupId: 'OpenAI',
    groupLabel: 'OpenAI',
    groupTest: (modelId: string) => {
      const normalizedModelId = modelId.toLowerCase();
      return (
        normalizedModelId.includes('openai-gpt') ||
        normalizedModelId.includes('openai-text-embedding') ||
        normalizedModelId.includes('openai')
      );
    },
  },
  {
    groupId: 'multilingual-e5',
    groupLabel: 'Multilingual E5',
    groupTest: (modelId: string) => modelId.toLowerCase().includes('multilingual-e5'),
  },
];
