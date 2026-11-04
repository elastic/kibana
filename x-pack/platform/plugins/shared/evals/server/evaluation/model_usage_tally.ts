/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluateResultUsage } from '@kbn/evals-common';
import type { InferenceCallbacks } from '@kbn/inference-common';

export interface ModelUsageTally {
  /** Inference client callbacks that count every model call the client makes. */
  callbacks: InferenceCallbacks;
  /** The totals so far, or `undefined` when no model call was made. */
  getUsage: () => EvaluateResultUsage | undefined;
}

/**
 * Adds up the tokens of an evaluator's model calls. Every call counts, including retries and
 * failures, and the totals follow Agent Builder's round usage: output includes reasoning.
 */
export const createModelUsageTally = (): ModelUsageTally => {
  let llmCalls = 0;
  let llmCallsWithoutUsage = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedInputTokens: number | undefined;
  let reasoningTokens: number | undefined;

  return {
    callbacks: {
      complete: ({ tokens }) => {
        llmCalls += 1;
        if (!tokens) {
          llmCallsWithoutUsage += 1;
          return;
        }
        inputTokens += tokens.prompt;
        // The inference client counts thinking apart from completion.
        outputTokens += tokens.completion + (tokens.thinking ?? 0);
        if (tokens.cached !== undefined) {
          cachedInputTokens = (cachedInputTokens ?? 0) + tokens.cached;
        }
        if (tokens.thinking !== undefined) {
          reasoningTokens = (reasoningTokens ?? 0) + tokens.thinking;
        }
      },
      error: () => {
        llmCalls += 1;
        llmCallsWithoutUsage += 1;
      },
    },
    getUsage: () =>
      llmCalls === 0
        ? undefined
        : {
            input_tokens: inputTokens,
            ...(cachedInputTokens === undefined ? {} : { cached_input_tokens: cachedInputTokens }),
            output_tokens: outputTokens,
            ...(reasoningTokens === undefined ? {} : { reasoning_tokens: reasoningTokens }),
            llm_calls: llmCalls,
            llm_calls_without_usage: llmCallsWithoutUsage,
          },
  };
};
