/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ModelFamily, ModelProvider } from '../model_provider';

export interface ModelDefinition {
  id: string;
  provider: ModelProvider;
  family: ModelFamily;
  contextWindow: number;
  /**
   * `false` for models that reject the `temperature` inference parameter
   * (e.g. Bedrock surfaces `temperature is deprecated for this model` for
   * Claude Opus 4.7). Treated as `true` when omitted to preserve existing
   * behavior for models we have not explicitly classified.
   */
  supportsTemperature?: boolean;
}

/**
 * Retrieve a model definition from the given full model name, if available.
 */
export const getModelDefinition = (fullModelName: string): ModelDefinition | undefined => {
  return knownModels.find(
    (model) =>
      fullModelName.includes(model.id) || fullModelName.includes(model.id.replaceAll('.', '-'))
  );
};

/**
 * List of manually maintained model definitions to use as fallback for feature detection.
 */
export const knownModels: ModelDefinition[] = [
  {
    id: 'gpt-4o-mini',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 128000,
  },
  {
    id: 'gpt-4o',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 128000,
  },
  {
    id: 'gpt-4.1-mini',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 1000000,
  },
  {
    id: 'gpt-4.1-nano',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 1000000,
  },
  {
    id: 'gpt-4.1',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 1000000,
  },
  {
    id: 'gemini-1.5-pro',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
  },
  {
    id: 'gemini-1.5-flash',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
  },
  {
    id: 'gemini-2.0-flash',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
  },
  {
    id: 'gemini-2.0-pro',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 2000000,
  },
  {
    id: 'gemini-2.0-flash-lite',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
  },
  {
    id: 'gemini-2.5-pro',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
  },
  {
    id: 'gemini-2.5-flash',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 128000, // or 1000000 in MAX mode...
  },
  // Claude models
  {
    id: 'claude-3-sonnet',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    id: 'claude-3-haiku',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    id: 'claude-3-opus',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    id: 'claude-3.5-sonnet',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    id: 'claude-3.5-haiku',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    id: 'claude-3.7-sonnet',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    id: 'claude-4-sonnet',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
  {
    id: 'claude-4-opus',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    id: 'claude-4.5-sonnet',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
  {
    id: 'claude-4.6-sonnet',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
  {
    id: 'claude-4.6-opus',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    // Claude Opus 4.7 (released Nov 2025). On Bedrock the model returns
    // `temperature is deprecated for this model` if the param is sent, so we
    // mark it as not supporting temperature; downstream callers omit the
    // parameter and let the provider default apply.
    id: 'claude-opus-4-7',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
    supportsTemperature: false,
  },
  // OpenAI o-series reasoning models
  {
    id: 'o3-mini',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 200000,
  },
  {
    id: 'o3',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 200000,
  },
  {
    id: 'o4-mini',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 200000,
  },
];
