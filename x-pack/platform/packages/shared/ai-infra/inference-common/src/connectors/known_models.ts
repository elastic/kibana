/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ModelFamily, ModelProvider } from '../model_provider';

export interface ModelDefinition {
  /** Canonical id, used to match the model against a full model name string. */
  id: string;
  /**
   * Additional id spellings this definition should match. Useful when a provider ships the same
   * model under multiple naming conventions — e.g. Claude 4+ is `claude-sonnet-4-5` on Bedrock /
   * Anthropic direct / Vertex but `claude-4.5-sonnet` on Elastic Inference Service.
   */
  aliases?: string[];
  provider: ModelProvider;
  family: ModelFamily;
  contextWindow: number;
}

/**
 * Retrieve a model definition from the given full model name, if available.
 *
 * The match is a substring test against the canonical id (and each alias), and against the
 * dot-to-dash form of each — this covers the common id shapes across providers:
 * - EIS (`anthropic-claude-4.6-sonnet`, `openai-gpt-5.6-terra`, …) uses version-first with dots.
 * - Anthropic direct / Bedrock / Vertex use family-first with dashes since Claude 4
 *   (`claude-sonnet-4-6`, `claude-opus-4-1-20250805`, …).
 * - Older Claude generations (3.x) use version-first with dashes and a date suffix
 *   (`claude-3-5-sonnet-20241022`), which the dash-replaced form of `claude-3.5-sonnet` catches.
 *
 * Because the id order matters (first match wins), more specific canonical ids must appear before
 * shorter substrings — e.g. `claude-opus-4-1` before `claude-opus-4`, `gpt-5-mini` before `gpt-5`.
 */
export const getModelDefinition = (fullModelName: string): ModelDefinition | undefined => {
  return knownModels.find((model) =>
    [model.id, ...(model.aliases ?? [])].some(
      (candidate) =>
        fullModelName.includes(candidate) || fullModelName.includes(candidate.replaceAll('.', '-'))
    )
  );
};

/**
 * Manually maintained model definitions used as fallback for feature detection.
 *
 * When a provider ships the same model under multiple naming conventions (typically EIS
 * version-first vs native/Bedrock family-first for Claude 4+), pick one canonical id and put
 * the other one in `aliases` rather than adding a second entry.
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
  // Anthropic — Claude
  //
  // Claude 4+ ships under two conventions:
  // - EIS (Elastic Inference Service) uses version-first with dots
  //   (`anthropic-claude-4.6-sonnet`).
  // - Anthropic direct / Bedrock / Vertex use family-first with dashes since Claude 4
  //   (`claude-sonnet-4-6`, `claude-opus-4-1-20250805`, …).
  //
  // Canonical id is the family-first form; the EIS spelling is listed as an alias so that both
  // provider shapes resolve without needing two entries. Order is specific-first per canonical
  // id (e.g. `claude-opus-4-1` before `claude-opus-4`).
  //
  // Windows use the default context (no beta headers): Sonnet/Opus 4-4.5 are 200k default (1M
  // available only with the `context-1m-2025-08-07` beta header, which Kibana does not send).
  // Sonnet 4.6+, Opus 4.6+ and Claude 5 ship 1M natively.
  // ---------------------------------------------------------------------------
  // Claude 3.x — a single spelling. Version-first with dashes matches the dated Anthropic /
  // Bedrock ids via the dot-to-dash form of the entry id.
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
  // Claude 4.x — Sonnet
  {
    id: 'claude-sonnet-4-6',
    aliases: ['claude-4.6-sonnet'],
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
  {
    id: 'claude-sonnet-4-5',
    aliases: ['claude-4.5-sonnet'],
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    id: 'claude-sonnet-4',
    aliases: ['claude-4-sonnet'],
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  // Claude 4.x — Opus
  {
    id: 'claude-opus-4-8',
    aliases: ['claude-4.8-opus'],
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
  {
    id: 'claude-opus-4-7',
    aliases: ['claude-4.7-opus'],
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
  {
    id: 'claude-opus-4-6',
    aliases: ['claude-4.6-opus'],
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
  {
    id: 'claude-opus-4-5',
    aliases: ['claude-4.5-opus'],
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    id: 'claude-opus-4-1',
    aliases: ['claude-4.1-opus'],
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  {
    id: 'claude-opus-4',
    aliases: ['claude-4-opus'],
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  // Claude 4.x — Haiku
  {
    id: 'claude-haiku-4-5',
    aliases: ['claude-4.5-haiku'],
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 200000,
  },
  // Claude 5.x
  {
    id: 'claude-fable-5-1',
    aliases: ['claude-5.1-fable'],
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
  {
    id: 'claude-fable-5',
    aliases: ['claude-5-fable'],
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
  {
    id: 'claude-sonnet-5',
    aliases: ['claude-5-sonnet'],
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
  {
    id: 'claude-opus-5',
    aliases: ['claude-5-opus'],
    provider: ModelProvider.Anthropic,
    family: ModelFamily.Claude,
    contextWindow: 1000000,
  },
];
