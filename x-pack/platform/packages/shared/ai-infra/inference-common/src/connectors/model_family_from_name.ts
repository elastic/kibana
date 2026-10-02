/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ModelFamily } from '../model_provider';
import { getModelDefinition } from './known_models';

/**
 * Infers the model family from a model name.
 *
 * `knownModels` is manually maintained and lags what is actually deployed (it stops at
 * gemini-2.5 / gpt-4.1, while EIS already serves `google-gemini-3.1-pro` and
 * `openai-gpt-5.5`), so it is consulted first for its exact knowledge and we then fall
 * back to matching the family token, which stays correct as new versions land.
 *
 * Returns `undefined` for an unrecognized name so callers can decide what that means
 * instead of receiving a plausible-looking default.
 */
export const getModelFamilyFromName = (modelName: string): ModelFamily | undefined => {
  if (!modelName) {
    return undefined;
  }

  const known = getModelDefinition(modelName);
  if (known) {
    return known.family;
  }

  // Normalize separators so `gpt-oss`, `gpt_oss` and `gpt.oss` all match alike.
  const normalized = modelName.toLowerCase().replace(/[_.]/g, '-');

  // Ordered: the first token found wins. `claude` before `sonnet`/`opus`/`haiku`
  // so an Anthropic name is attributed by its family, not by its size variant.
  const tokens: Array<[RegExp, ModelFamily]> = [
    [/\bclaude\b|\bsonnet\b|\bopus\b|\bhaiku\b/, ModelFamily.Claude],
    [/\bgemini\b/, ModelFamily.Gemini],
    [/\bgpt\b|\bo\d+(-mini|-preview)?\b/, ModelFamily.GPT],
  ];

  for (const [pattern, family] of tokens) {
    if (pattern.test(normalized)) {
      return family;
    }
  }

  return undefined;
};
