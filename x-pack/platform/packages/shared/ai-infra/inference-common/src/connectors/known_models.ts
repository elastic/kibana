/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ModelFamily, ModelProvider } from '../model_provider';

export interface ModelDefinition {
  model: string;
  provider: ModelProvider;
  family: ModelFamily;
  contextWindow: number;
}

/**
 * Retrieve a model definition from the given full model name, if available.
 */
export const getModelDefinition = (fullModelName: string): ModelDefinition | undefined => {
  return knownModels.find(
    (model) =>
      fullModelName.includes(model.model) ||
      fullModelName.includes(model.model.replaceAll('.', '-'))
  );
};

/**
 * List of manually maintained model definitions to use as fallback for feature detection.
 */
export const knownModels: ModelDefinition[] = [
  {
    model: 'gpt-4o-mini',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 128000,
  },
  {
    model: 'gpt-4o',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 128000,
  },
  {
    model: 'gpt-4.1-mini',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 1000000,
  },
  {
    model: 'gpt-4.1-nano',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 1000000,
  },
  {
    model: 'gpt-4.1',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 1000000,
  },
  {
    model: 'gemini-1.5-pro',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
  },
  {
    model: 'gemini-1.5-flash',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
  },
  {
    model: 'gemini-2.0-flash',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
  },
  {
    model: 'gemini-2.0-pro',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 2000000,
  },
  {
    model: 'gemini-2.0-flash-lite',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
  },
  {
    model: 'gemini-2.5-pro',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
  },
  {
    model: 'gemini-2.5-flash',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 128000, // or 1000000 in MAX mode...
  },
  // Claude models
  {
    model: 'claude-3-sonnet',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    model: 'claude-3-haiku',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    model: 'claude-3-opus',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    model: 'claude-3.5-sonnet',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    model: 'claude-3.5-haiku',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    model: 'claude-3.7-sonnet',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    model: 'claude-4-sonnet',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    model: 'claude-4-opus',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
];
