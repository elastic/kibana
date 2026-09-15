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
}

/**
 * Retrieve a model definition from the given full model name, if available.
 *
 * The match is a substring test against the raw id and against the id with dots replaced by
 * dashes — this covers the common id shapes across providers:
 * - EIS (`anthropic-claude-4.6-sonnet`, `openai-gpt-5.6-terra`, …) uses version-first with dots.
 * - Anthropic direct / Bedrock / Vertex use family-first with dashes since Claude 4
 *   (`claude-sonnet-4-6`, `claude-opus-4-1-20250805`, …).
 * - Older Claude generations (3.x) use version-first with dashes and a date suffix
 *   (`claude-3-5-sonnet-20241022`), which the dash-replaced form of `claude-3.5-sonnet` catches.
 *
 * Because the id order matters (first match wins), more specific ids must appear before shorter
 * substrings — e.g. `claude-opus-4-1` before `claude-opus-4`, `gpt-5-mini` before `gpt-5`.
 */
export const getModelDefinition = (fullModelName: string): ModelDefinition | undefined => {
  return knownModels.find(
    (model) =>
      fullModelName.includes(model.id) || fullModelName.includes(model.id.replaceAll('.', '-'))
  );
};

/**
 * Manually maintained model definitions used as fallback for feature detection.
 *
 * When a provider ships a new model family or renames one, add both the version-first (EIS
 * spelling) and the family-first (native/Bedrock spelling) forms if the two conventions differ.
 */
export const knownModels: ModelDefinition[] = [
  // ---------------------------------------------------------------------------
  // OpenAI — GPT
  // ---------------------------------------------------------------------------
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
  // GPT-5 family (specific before general so `gpt-5-mini` doesn't collapse to `gpt-5`).
  {
    id: 'gpt-5.6-luna',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 1050000,
  },
  {
    id: 'gpt-5.6-terra',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 1050000,
  },
  {
    id: 'gpt-5.6-sol',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 1050000,
  },
  {
    id: 'gpt-5.5',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 1050000,
  },
  {
    id: 'gpt-5.4-mini',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 400000,
  },
  {
    id: 'gpt-5.4-nano',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 400000,
  },
  {
    id: 'gpt-5.4',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 400000,
  },
  {
    id: 'gpt-5.2',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 400000,
  },
  {
    id: 'gpt-5-mini',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 400000,
  },
  {
    id: 'gpt-5-nano',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 400000,
  },
  {
    id: 'gpt-5',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 400000,
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
  // OpenAI GPT-OSS (open-weights)
  {
    id: 'gpt-oss-120b',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 128000,
  },
  {
    id: 'gpt-oss-20b',
    provider: ModelProvider.OpenAI,
    family: ModelFamily.GPT,
    contextWindow: 128000,
  },
  // ---------------------------------------------------------------------------
  // Google — Gemini (specific before general within each version)
  // ---------------------------------------------------------------------------
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
    id: 'gemini-2.0-flash-lite',
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
    id: 'gemini-2.5-flash-lite',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
  },
  {
    id: 'gemini-2.5-flash',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    // 128k default; 1M in MAX mode.
    contextWindow: 128000,
  },
  {
    id: 'gemini-2.5-pro',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
  },
  {
    id: 'gemini-3.1-flash-lite',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
  },
  {
    id: 'gemini-3.1-pro',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
  },
  {
    id: 'gemini-3.0-flash',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
  },
  {
    id: 'gemini-3.5-flash-lite',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
  },
  {
    id: 'gemini-3.5-flash',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
  },
  {
    id: 'gemini-3.6-flash',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
  },
  {
    id: 'gemini-3.7-flash',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
  },
  // Vertex native uses `gemini-3-pro-preview`; a bare version-first id catches it too.
  {
    id: 'gemini-3-pro',
    provider: ModelProvider.Google,
    family: ModelFamily.Gemini,
    contextWindow: 1000000,
  },
  // ---------------------------------------------------------------------------
  // Anthropic — Claude (version-first with dot / dashed date form)
  //
  // Two spelling conventions live side by side:
  // - Version-first with dots (EIS + older Anthropic API ids after dash-replace).
  // - Family-first with dashes (Anthropic direct / Bedrock / Vertex since Claude 4).
  //
  // Both forms are included below, most-specific first per pattern. Windows use the default
  // context (no beta headers): Sonnet/Opus 4-4.5 are 200k default (1M available only with the
  // `context-1m-2025-08-07` beta header, which Kibana does not send). Sonnet 4.6+, Opus 4.6+
  // and Claude 5 ship 1M natively.
  // ---------------------------------------------------------------------------
  // Claude 3.x (version-first)
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
  // Claude 4.x — version-first (EIS spelling: `anthropic-claude-4.5-sonnet`, …).
  {
    id: 'claude-4.5-sonnet',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    id: 'claude-4.5-opus',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    id: 'claude-4.5-haiku',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
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
    contextWindow: 1000000,
  },
  {
    id: 'claude-4.7-opus',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
  {
    id: 'claude-4.8-opus',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
  {
    id: 'claude-4.1-opus',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    id: 'claude-4-sonnet',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    id: 'claude-4-opus',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  // Claude 5.x — version-first (EIS spelling).
  {
    id: 'claude-5.1-fable',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
  {
    id: 'claude-5-fable',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
  {
    id: 'claude-5-sonnet',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
  {
    id: 'claude-5-opus',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
  // Claude 4.x — family-first (Anthropic direct / Bedrock / Vertex spelling).
  {
    id: 'claude-sonnet-4-6',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
  {
    id: 'claude-sonnet-4-5',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    id: 'claude-sonnet-4',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    id: 'claude-opus-4-8',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
  {
    id: 'claude-opus-4-7',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
  {
    id: 'claude-opus-4-6',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
  {
    id: 'claude-opus-4-5',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    id: 'claude-opus-4-1',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    id: 'claude-opus-4',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    id: 'claude-haiku-4-5',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  // Claude 5.x — family-first (Anthropic direct / Bedrock / Vertex spelling).
  {
    id: 'claude-fable-5-1',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
  {
    id: 'claude-fable-5',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
  {
    id: 'claude-sonnet-5',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
  {
    id: 'claude-opus-5',
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
];
