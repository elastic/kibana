/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Deterministic LLM usage tally for one live-pipeline stage. In live mode the LLM calls happen
 * inside server-side workflow executions whose spans never nest under the eval's trace, so the
 * trace-based token evaluators cannot see them — instead usage is read from product metadata:
 * the onboarding status payload (`tokensUsed`) and conversation rounds (`model_usage`).
 */
export interface LiveStageTokenUsage {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  /** Number of LLM calls, when the source reports it (conversation rounds do; onboarding does not). */
  llmCalls: number;
}

export const emptyStageTokenUsage = (): LiveStageTokenUsage => ({
  inputTokens: 0,
  outputTokens: 0,
  cachedTokens: 0,
  llmCalls: 0,
});

export const addStageTokenUsage = (
  a: LiveStageTokenUsage,
  b: LiveStageTokenUsage
): LiveStageTokenUsage => ({
  inputTokens: a.inputTokens + b.inputTokens,
  outputTokens: a.outputTokens + b.outputTokens,
  cachedTokens: a.cachedTokens + b.cachedTokens,
  llmCalls: a.llmCalls + b.llmCalls,
});
