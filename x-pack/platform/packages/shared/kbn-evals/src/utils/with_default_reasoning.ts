/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BoundChatCompleteAPI,
  BoundInferenceClient,
  BoundPromptAPI,
  ChatCompletionReasoning,
  ChatCompletionReasoningEffort,
  Prompt,
  UnboundChatCompleteOptions,
  UnboundPromptOptions,
} from '@kbn/inference-common';

/**
 * Makes every `chatComplete` and `prompt` call on a bound client ask the model for `effort`
 * unless the call sets `reasoning.effort` itself. Other `reasoning` fields a call sets (e.g.
 * `exclude`) are kept alongside the default effort.
 */
export function withDefaultReasoning(
  client: BoundInferenceClient,
  effort: ChatCompletionReasoningEffort
): BoundInferenceClient {
  const withReasoning = (reasoning: ChatCompletionReasoning | undefined) => ({
    effort,
    ...reasoning,
  });

  return {
    ...client,
    bindTo: (options) => client.bindTo(options),
    chatComplete: (<TChatCompleteOptions extends UnboundChatCompleteOptions>(
      options: TChatCompleteOptions
    ) => {
      return client.chatComplete({ ...options, reasoning: withReasoning(options.reasoning) });
    }) as BoundChatCompleteAPI,
    prompt: (<TPrompt extends Prompt, TPromptOptions extends UnboundPromptOptions<TPrompt>>(
      options: { prompt: TPrompt } & TPromptOptions
    ) => {
      return client.prompt({ ...options, reasoning: withReasoning(options.reasoning) });
    }) as BoundPromptAPI,
  };
}
