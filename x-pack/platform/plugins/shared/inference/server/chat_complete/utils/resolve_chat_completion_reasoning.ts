/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionReasoning } from '@kbn/inference-common';

// OpenAI Chat Completions rejects function tools on these reasoning models unless
// reasoning effort is explicitly `none`. Keep the default scoped to them: models with
// mandatory reasoning (e.g. Gemini Pro, gpt-oss via EIS) reject `effort: none` with a 400.
// Remove once Elasticsearch exposes parameter capabilities for inference endpoints.
const MODELS_REJECTING_TOOLS_WITHOUT_NONE_REASONING = ['gpt-5', 'gpt-6'];

// Narrower than the list above: sent straight to OpenAI, where older gpt-5 models reject `none`.
const OPENAI_MODELS_REQUIRING_NONE_REASONING_EFFORT_WITH_TOOLS = ['gpt-5-6', 'gpt-6'];

const modelMatchesAny = (model: string, candidates: readonly string[]): boolean => {
  // Normalize ids like `openai/gpt-5`, `openai-gpt-5.4` or `.openai-gpt-5.4-chat_completion`.
  const normalized = model.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return candidates.some((candidate) => new RegExp(`(?:^|-)${candidate}(?:-|$)`).test(normalized));
};

/**
 * Resolve the reasoning payload for a unified chat completion request.
 *
 * OpenAI Chat Completions rejects function tools when reasoning effort defaults
 * to anything other than `none` on newer reasoning models (gpt-5 and gpt-6 families). When
 * native tools are present, the caller did not set reasoning, and the model is
 * known to require it, default to `{ effort: 'none' }`. Explicit caller values
 * always win. For every other model the field is omitted, since models with
 * mandatory reasoning reject `effort: none` outright.
 */
export const resolveChatCompletionReasoning = ({
  reasoning,
  hasNativeTools,
  model,
}: {
  reasoning?: ChatCompletionReasoning;
  hasNativeTools: boolean;
  model?: string;
}): ChatCompletionReasoning | undefined => {
  if (reasoning) {
    return reasoning;
  }

  if (
    hasNativeTools &&
    model &&
    modelMatchesAny(model, MODELS_REJECTING_TOOLS_WITHOUT_NONE_REASONING)
  ) {
    return { effort: 'none' };
  }

  return undefined;
};

/**
 * Resolve the `reasoning_effort` to send to the OpenAI Chat Completions API, which rejects
 * function tools on gpt-5.6 and gpt-6 models unless the effort is explicitly `none`.
 */
export const resolveOpenAIReasoningEffort = ({
  hasNativeTools,
  model,
}: {
  hasNativeTools: boolean;
  model?: string;
}): 'none' | undefined => {
  if (
    hasNativeTools &&
    model &&
    modelMatchesAny(model, OPENAI_MODELS_REQUIRING_NONE_REASONING_EFFORT_WITH_TOOLS)
  ) {
    return 'none';
  }

  return undefined;
};
