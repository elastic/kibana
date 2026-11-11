/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluateResultUsage, EvaluateResultUsageCall } from '@kbn/evals-common';
import type { InferenceCallbacks } from '@kbn/inference-common';
import { isInferenceError } from '@kbn/inference-common';

/**
 * The response schema's bound on error messages. Provider errors can carry the upstream response
 * body, and the kbn-evals client rejects a whole response with a message over it.
 */
export const MAX_ERROR_MESSAGE_LENGTH = 8192;

export interface ModelUsageTally {
  /** Inference client callbacks that count every model call the client makes. */
  callbacks: InferenceCallbacks;
  /** The totals so far, or `undefined` when no model call was made. */
  getUsage: () => EvaluateResultUsage | undefined;
}

/**
 * Adds up the tokens of an evaluator's model calls, following Agent Builder's round usage: output
 * includes reasoning. The callbacks fire once per call, after the inference client's own retries,
 * so a retried call counts once with its final attempt's tokens and a failed call with none.
 */
export const createModelUsageTally = (): ModelUsageTally => {
  const calls: EvaluateResultUsageCall[] = [];
  let llmCallsWithoutUsage = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedInputTokens: number | undefined;
  let reasoningTokens: number | undefined;

  return {
    callbacks: {
      complete: ({ tokens, model }) => {
        const modelField = model ? { model } : {};
        if (!tokens) {
          llmCallsWithoutUsage += 1;
          calls.push({ status: 'ok', ...modelField });
          return;
        }
        const { prompt, completion, cached, thinking } = tokens;
        // The inference client counts thinking apart from completion.
        const callOutputTokens = completion + (thinking ?? 0);
        inputTokens += prompt;
        outputTokens += callOutputTokens;
        if (cached !== undefined) {
          cachedInputTokens = (cachedInputTokens ?? 0) + cached;
        }
        if (thinking !== undefined) {
          reasoningTokens = (reasoningTokens ?? 0) + thinking;
        }
        calls.push({
          status: 'ok',
          ...modelField,
          input_tokens: prompt,
          ...(cached === undefined ? {} : { cached_input_tokens: cached }),
          output_tokens: callOutputTokens,
          ...(thinking === undefined ? {} : { reasoning_tokens: thinking }),
        });
      },
      error: ({ error }) => {
        llmCallsWithoutUsage += 1;
        calls.push({
          status: 'error',
          error: {
            ...(isInferenceError(error) ? { code: error.code } : {}),
            message: error.message.slice(0, MAX_ERROR_MESSAGE_LENGTH),
          },
        });
      },
    },
    getUsage: () =>
      calls.length === 0
        ? undefined
        : {
            input_tokens: inputTokens,
            ...(cachedInputTokens === undefined ? {} : { cached_input_tokens: cachedInputTokens }),
            output_tokens: outputTokens,
            ...(reasoningTokens === undefined ? {} : { reasoning_tokens: reasoningTokens }),
            llm_calls: calls.length,
            llm_calls_without_usage: llmCallsWithoutUsage,
            calls: [...calls],
          },
  };
};
