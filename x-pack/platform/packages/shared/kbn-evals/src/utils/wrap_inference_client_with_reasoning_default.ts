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
  Prompt,
  UnboundChatCompleteOptions,
  UnboundPromptOptions,
} from '@kbn/inference-common';

// Reasoning-mandatory EIS endpoints reject `{ effort: 'none' }` (the adapter's
// default when tools are attached); `{ enabled: true }` uses the model's default effort.
const DEFAULT_REASONING: ChatCompletionReasoning = { enabled: true };

// External OpenAI reasoning models require `effort: none` with tools, so only EIS
// connectors get the reasoning default. Explicit caller `reasoning` always wins.
const isEisConnectorId = (connectorId: string): boolean => connectorId.startsWith('eis-');

function withReasoningDefault(
  client: BoundInferenceClient,
  connectorId: string,
  reasoning: ChatCompletionReasoning
): BoundInferenceClient {
  const shouldInject = isEisConnectorId(connectorId);
  return {
    ...client,
    bindTo: (options) =>
      withReasoningDefault(client.bindTo(options), options.connectorId, reasoning),
    chatComplete: (<TChatCompleteOptions extends UnboundChatCompleteOptions>(
      options: TChatCompleteOptions
    ) => {
      return client.chatComplete(
        shouldInject && options.reasoning == null ? { ...options, reasoning } : options
      );
    }) as BoundChatCompleteAPI,
    prompt: (<TPrompt extends Prompt, TPromptOptions extends UnboundPromptOptions<TPrompt>>(
      options: { prompt: TPrompt } & TPromptOptions
    ) => {
      return client.prompt(
        shouldInject && options.reasoning == null ? { ...options, reasoning } : options
      );
    }) as BoundPromptAPI,
  };
}

/**
 * Applies a default `reasoning` to EIS `chatComplete`/`prompt` calls that don't set one,
 * re-evaluated per connector across `bindTo`. Non-EIS connectors are left untouched.
 */
export function wrapInferenceClientWithReasoningDefault(
  client: BoundInferenceClient,
  connectorId: string,
  reasoning: ChatCompletionReasoning = DEFAULT_REASONING
): BoundInferenceClient {
  return withReasoningDefault(client, connectorId, reasoning);
}
