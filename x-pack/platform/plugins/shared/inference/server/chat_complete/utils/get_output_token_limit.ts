/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import { normalizeMaxTokens } from '@kbn/inference-common';

/**
 * OpenAI reasoning models reject `max_tokens` and require `max_completion_tokens`.
 * The same families skip temperature in `get_temperature.ts`, plus o4, which has the same limit.
 */
const OPENAI_MODELS_REQUIRING_MAX_COMPLETION_TOKENS = ['o1', 'o3', 'o4', 'gpt-5'];

interface OutputTokenLimitOptions {
  connector?: InferenceConnector;
  modelName?: string;
  modelId?: string;
}

export type OutputTokenLimit =
  | { max_tokens: number }
  | { max_completion_tokens: number }
  | Record<string, never>;

const modelRequiresMaxCompletionTokens = (model: string): boolean => {
  const normalizedModelName = model.toLowerCase();
  const baseModelName = normalizedModelName.split('/').pop() ?? normalizedModelName;
  const matchesFamily = (candidate: string, value: string): boolean =>
    value.startsWith(candidate) || value.endsWith(candidate);

  if (
    OPENAI_MODELS_REQUIRING_MAX_COMPLETION_TOKENS.some((candidate) =>
      matchesFamily(candidate, baseModelName)
    )
  ) {
    return true;
  }

  // Inference endpoint ids look like `.openai-gpt-5.4-chat` rather than `gpt-5`.
  const dashed = normalizedModelName.replace(/[^a-z0-9]+/g, '-');
  return OPENAI_MODELS_REQUIRING_MAX_COMPLETION_TOKENS.some((candidate) =>
    new RegExp(`(?:^|-)${candidate}(?:-|$)`).test(dashed)
  );
};

/**
 * Maps a caller token cap onto the OpenAI-shaped field the target model accepts.
 * Invalid caps are omitted so the provider default applies.
 */
export const getOutputTokenLimit = (
  maxTokens: unknown,
  { connector, modelName, modelId }: OutputTokenLimitOptions = {}
): OutputTokenLimit => {
  const normalized = normalizeMaxTokens(maxTokens);
  if (normalized === undefined) {
    return {};
  }

  const model =
    modelName?.trim() ||
    modelId?.trim() ||
    connector?.config?.providerConfig?.model_id ||
    connector?.config?.defaultModel;

  if (typeof model === 'string' && modelRequiresMaxCompletionTokens(model)) {
    return { max_completion_tokens: normalized };
  }

  return { max_tokens: normalized };
};
