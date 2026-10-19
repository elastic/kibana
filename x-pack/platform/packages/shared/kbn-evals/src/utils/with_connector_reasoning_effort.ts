/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BoundChatCompleteAPI,
  BoundInferenceClient,
  BoundOutputAPI,
  BoundPromptAPI,
  ChatCompletionReasoning,
  ChatCompletionReasoningEffort,
  Prompt,
  ToolSchema,
  UnboundChatCompleteOptions,
  UnboundOutputOptions,
  UnboundPromptOptions,
} from '@kbn/inference-common';
import type { EvalConnector } from './eval_connector';
import { getConnectorReasoningEffort } from './eval_connector';

/** Sends `effort` on every call, overriding any `reasoning.effort` the call sets. */
function withReasoningEffort(
  client: BoundInferenceClient,
  effort: ChatCompletionReasoningEffort
): BoundInferenceClient {
  const withEffort = (reasoning: ChatCompletionReasoning | undefined) => ({ ...reasoning, effort });

  return {
    ...client,
    chatComplete: (<TOptions extends UnboundChatCompleteOptions>(options: TOptions) =>
      client.chatComplete({
        ...options,
        reasoning: withEffort(options.reasoning),
      })) as BoundChatCompleteAPI,
    prompt: (<TPrompt extends Prompt, TOptions extends UnboundPromptOptions<TPrompt>>(
      options: { prompt: TPrompt } & TOptions
    ) => client.prompt({ ...options, reasoning: withEffort(options.reasoning) })) as BoundPromptAPI,
    output: (<
      TId extends string,
      TOutputSchema extends ToolSchema | undefined,
      TStream extends boolean
    >(
      options: UnboundOutputOptions<TId, TOutputSchema, TStream>
    ) => client.output({ ...options, reasoning: withEffort(options.reasoning) })) as BoundOutputAPI,
  };
}

export function withConnectorReasoningEffort(
  client: BoundInferenceClient,
  connectorId: string,
  connectors: EvalConnector[]
): BoundInferenceClient {
  const connector = connectors.find((c) => c.id === connectorId);
  const effort = connector && getConnectorReasoningEffort(connector);

  return {
    ...(effort ? withReasoningEffort(client, effort) : client),
    bindTo: (options) =>
      withConnectorReasoningEffort(client.bindTo(options), options.connectorId, connectors),
  };
}
