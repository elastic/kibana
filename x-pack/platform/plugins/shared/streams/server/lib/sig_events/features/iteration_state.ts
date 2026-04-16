/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import type { Feature, IterationResult } from '@kbn/streams-schema';
import { sumTokens } from '@kbn/streams-ai';

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const EMPTY_TOKENS: ChatCompletionTokenCount = {
  prompt: 0,
  completion: 0,
  total: 0,
  cached: 0,
};

export interface AccumulatedIterationState {
  discoveredFeatures: Feature[];
  iterationResults: IterationResult[];
}

export function createEmptyAccumulatedState(): AccumulatedIterationState {
  return {
    discoveredFeatures: [],
    iterationResults: [],
  };
}

export function deriveSuccessCount(results: IterationResult[]): number {
  return results.filter((r) => r.state === 'success').length;
}

export function deriveTotalTokensUsed(results: IterationResult[]): ChatCompletionTokenCount {
  return results.reduce((acc, r) => sumTokens(acc, r.tokensUsed), { ...EMPTY_TOKENS });
}
