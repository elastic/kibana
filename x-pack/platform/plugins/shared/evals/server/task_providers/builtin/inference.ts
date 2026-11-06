/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole } from '@kbn/inference-common';
import type { Message } from '@kbn/inference-common';
import { BUILT_IN_TASK_PROVIDERS } from '../types';
import type { EvalsTaskProvider } from '../types';
import { getCurrentTraceId, withEvalsTaskSpan } from '../tracing';

const PROMPT_KEYS = ['input', 'prompt', 'question', 'query', 'text', 'message'] as const;

/**
 * Best-effort extraction of a user prompt from an arbitrary example input. Suites
 * with bespoke inputs should register their own task provider; this built-in
 * exists so "direct model" evaluations work without any wiring.
 */
const extractPrompt = (
  input: Record<string, unknown>,
  params?: Record<string, unknown>
): string => {
  for (const key of PROMPT_KEYS) {
    const value = input[key] ?? params?.[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return JSON.stringify(input);
};

/** Evaluates a model with one traced chat completion for trace-based scoring. */
export const createInferenceTaskProvider = (): EvalsTaskProvider => ({
  name: BUILT_IN_TASK_PROVIDERS.inference,
  description: 'Directly evaluate a connector model with a single chat completion.',
  run: async ({ input, connectorId, params, getInferenceClient, abortSignal }) => {
    const client = await getInferenceClient(connectorId);
    const system = typeof params?.system === 'string' ? params.system : undefined;
    const messages: Message[] = [{ role: MessageRole.User, content: extractPrompt(input, params) }];

    return withEvalsTaskSpan('task · direct model', async () => {
      const traceId = getCurrentTraceId();

      const response = await client.chatComplete({
        ...(system ? { system } : {}),
        messages,
        abortSignal,
      });

      return {
        output: {
          content: response.content,
          ...(response.toolCalls && response.toolCalls.length > 0
            ? { tool_calls: response.toolCalls }
            : {}),
        },
        traceId,
      };
    });
  },
});
