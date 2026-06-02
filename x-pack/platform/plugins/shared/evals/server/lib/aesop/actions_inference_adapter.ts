/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { Logger } from '@kbn/logging';
import { buildLlmRequestBody, extractLlmResponseText, getConnectorTypeId } from './llm_defaults';

type ActionsClient = Awaited<ReturnType<ActionsPluginStart['getActionsClientWithRequest']>>;

/**
 * Shape expected by `@kbn/evals` LLM-judge evaluators. Evaluators only call
 * `chatComplete({ messages }) → { content }` so we expose exactly that.
 */
export interface InferenceClient {
  chatComplete: (params: {
    messages: Array<{ role: string; content: string }>;
  }) => Promise<{ content?: string }>;
}

export interface ActionsInferenceClientOptions {
  actionsClient: ActionsClient;
  connectorId: string;
  logger: Logger;
  /**
   * Base system prompt prepended to every request. Evaluator prompts already
   * include their own task instructions in the user message, so the default
   * is intentionally minimal.
   */
  baseSystemPrompt?: string;
  /**
   * Temperature override. LLM judges benefit from low variance, so this
   * defaults to 0.1 when omitted. `buildLlmRequestBody` will strip it for
   * Claude 4.5+ on Bedrock where the parameter is deprecated.
   */
  temperature?: number;
}

/**
 * Bridges the `actionsClient.execute({subAction: 'run', ...})` surface to the
 * `inferenceClient.chatComplete` surface that `@kbn/evals` LLM-judge
 * evaluators call. This is the adapter that makes the EvaluatorRegistry
 * usable from routes that only have a scoped `actionsClient` (AESOP runs
 * under a user request, not with a kibana-internal inference client).
 */
export const createActionsInferenceClient = ({
  actionsClient,
  connectorId,
  logger,
  baseSystemPrompt,
  temperature = 0.1,
}: ActionsInferenceClientOptions): InferenceClient => ({
  chatComplete: async ({ messages }) => {
    // Evaluator prompts sometimes include a role: 'system' entry themselves —
    // buildLlmRequestBody already merges a top-level `system` with `system`
    // messages so both patterns work. We split them here so the top-level
    // value remains stable across calls and we don't accidentally drop the
    // per-evaluator system content.
    const userOrAssistant = messages.filter((m) => m.role !== 'system');
    const inlineSystem = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');

    const combinedSystem =
      [baseSystemPrompt, inlineSystem].filter(Boolean).join('\n\n') || undefined;

    const connectorTypeId = await getConnectorTypeId(actionsClient, connectorId);

    const result = await actionsClient.execute({
      actionId: connectorId,
      params: {
        subAction: 'run',
        subActionParams: {
          body: JSON.stringify(
            buildLlmRequestBody({
              system: combinedSystem,
              messages: userOrAssistant as Array<{
                role: 'user' | 'assistant';
                content: string;
              }>,
              temperature,
              connectorTypeId,
            })
          ),
        },
      },
    });

    if (result.status === 'error') {
      const message = `Connector execution failed: ${result.message ?? ''} ${
        result.serviceMessage ?? ''
      }`.trim();
      logger.warn(`[AESOP] inference adapter: ${message}`);
      throw new Error(message);
    }

    const content = extractLlmResponseText(result.data);
    return { content };
  },
});
