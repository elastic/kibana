/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { HttpHandler } from '@kbn/core/public';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import pRetry from 'p-retry';

type Messages = { message: string }[];

/** Maximum number of auto-confirm continuation calls per turn. */
const MAX_AUTO_CONFIRM_ROUNDS = 3;

interface Options {
  agentId?: string;
  /**
   * When true, the client automatically answers any pending structured prompts
   * that the agent emits after each API call:
   *   - `confirmation`      → allows (`allow: true`)
   *
   * The client loops until no unanswered prompts remain (capped at
   * {@link MAX_AUTO_CONFIRM_ROUNDS} continuations), merging all steps from
   * continuation calls into the final `steps[]` response. Callers see a clean
   * "send message → get response" interface with no prompt-ID handling.
   *
   * The loop throws if the cap is exceeded or if the server echoes a prompt id
   * that was already answered (both indicate a stuck agent rather than progress).
   */
  autoConfirm?: boolean;
}

interface ConverseFunctionParams {
  messages: Messages;
  conversationId?: string;
  options?: Options;
}

interface AgentBuilderConverseApiResponse {
  conversation_id: string;
  trace_id?: string;
  steps: any[];
  response: { message: string; prompts?: any[] };
}

type ConverseFunction = (params: ConverseFunctionParams) => Promise<{
  conversationId?: string;
  messages: Messages;
  errors: any[];
  steps?: any[];
  traceId?: string;
}>;

interface ExecuteToolParams {
  toolId: string;
  toolParams: Record<string, unknown>;
  connectorId?: string;
}

interface ExecuteToolResult {
  results: unknown[];
  errors: any[];
}

export class AgentBuilderEvaluationChatClient {
  constructor(
    private readonly fetch: HttpHandler,
    private readonly log: ToolingLog,
    private readonly connectorId: string
  ) {}

  private async executeWithRetry<T>(operationName: string, fn: () => Promise<T>): Promise<T> {
    return pRetry(fn, {
      retries: 2,
      minTimeout: 2000,
      onFailedAttempt: (error) => {
        const isLastAttempt = error.attemptNumber === error.retriesLeft + error.attemptNumber;

        if (isLastAttempt) {
          this.log.error(
            new Error(`Failed to call ${operationName} API after ${error.attemptNumber} attempts`, {
              cause: error,
            })
          );
          throw error;
        } else {
          this.log.warning(
            new Error(
              `${operationName} API call failed on attempt ${error.attemptNumber}; retrying...`,
              { cause: error }
            )
          );
        }
      },
    });
  }

  private getConfirmationPrompts = (responseMsg: { prompts?: any[] }): Record<string, unknown> => {
    const autoPrompts: Record<string, unknown> = {};
    for (const prompt of responseMsg?.prompts ?? []) {
      if (prompt?.id && prompt.type === 'confirmation') {
        autoPrompts[prompt.id] = { allow: true };
      }
    }
    return autoPrompts;
  };

  converse: ConverseFunction = async ({ messages, conversationId, options = {} }) => {
    this.log.info('Calling converse');

    const { agentId = agentBuilderDefaultAgentId, autoConfirm = false } = options;

    const callConverseApi = async (): Promise<{
      conversationId?: string;
      messages: { message: string }[];
      errors: any[];
      steps?: any[];
      traceId?: string;
    }> => {
      const chatResponseRaw = await this.fetch('/api/agent_builder/converse', {
        method: 'POST',
        version: '2023-10-31',
        body: JSON.stringify({
          agent_id: agentId,
          connector_id: this.connectorId,
          conversation_id: conversationId,
          input: messages[messages.length - 1].message,
        }),
      });
      const chatResponse = chatResponseRaw as AgentBuilderConverseApiResponse;

      const {
        conversation_id: conversationIdFromResponse,
        response: latestResponse,
        steps,
        trace_id: traceId,
      } = chatResponse;

      let allSteps: any[] = steps ?? [];
      let lastResponse = latestResponse;
      let currentConversationId = conversationIdFromResponse;

      if (autoConfirm) {
        let autoConfirmPrompts = this.getConfirmationPrompts(lastResponse);
        const answeredPromptIds = new Set<string>(Object.keys(autoConfirmPrompts));
        let rounds = 0;

        while (Object.keys(autoConfirmPrompts).length > 0) {
          if (rounds >= MAX_AUTO_CONFIRM_ROUNDS) {
            throw new Error(
              `autoConfirm: exceeded ${MAX_AUTO_CONFIRM_ROUNDS} continuation rounds. ` +
                `Outstanding prompt ids: ${Object.keys(autoConfirmPrompts).join(', ')}. ` +
                `This indicates a stuck agent — increase MAX_AUTO_CONFIRM_ROUNDS only if ` +
                `more than ${MAX_AUTO_CONFIRM_ROUNDS} sequential confirmations are genuinely expected.`
            );
          }

          const continuation = (await this.fetch('/api/agent_builder/converse', {
            method: 'POST',
            version: '2023-10-31',
            body: JSON.stringify({
              agent_id: agentId,
              connector_id: this.connectorId,
              conversation_id: currentConversationId,
              prompts: autoConfirmPrompts,
            }),
          })) as AgentBuilderConverseApiResponse;

          allSteps = [...allSteps, ...(continuation.steps ?? [])];
          lastResponse = continuation.response ?? lastResponse;
          currentConversationId = continuation.conversation_id ?? currentConversationId;
          rounds++;

          autoConfirmPrompts = this.getConfirmationPrompts(continuation.response);

          // A prompt id that was already answered means the agent is looping — fail loudly.
          const repeated = Object.keys(autoConfirmPrompts).filter((id) =>
            answeredPromptIds.has(id)
          );
          if (repeated.length > 0) {
            throw new Error(
              `autoConfirm: server re-emitted already-answered prompt id(s): ${repeated.join(
                ', '
              )}. ` + `This indicates a stuck agent.`
            );
          }
          Object.keys(autoConfirmPrompts).forEach((id) => answeredPromptIds.add(id));
        }
      }

      return {
        conversationId: currentConversationId,
        messages: [...messages, lastResponse],
        steps: allSteps,
        traceId,
        errors: [],
      };
    };

    try {
      return await this.executeWithRetry('converse', callConverseApi);
    } catch (error) {
      this.log.error('Error occurred while calling converse API');
      return {
        conversationId,
        steps: [],
        messages: [
          ...messages,
          {
            message:
              'This question could not be answered as an internal error occurred. Please try again.',
          },
        ],
        errors: [
          {
            error: {
              message: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            },
            type: 'error',
          },
        ],
      };
    }
  };

  executeTool = async ({
    toolId,
    toolParams,
    connectorId,
  }: ExecuteToolParams): Promise<ExecuteToolResult> => {
    this.log.info(`Calling executeTool for ${toolId}`);

    const callExecuteToolApi = async (): Promise<ExecuteToolResult> => {
      const response = await this.fetch('/api/agent_builder/tools/_execute', {
        method: 'POST',
        version: '2023-10-31',
        body: JSON.stringify({
          tool_id: toolId,
          tool_params: toolParams,
          connector_id: connectorId ?? this.connectorId,
        }),
      });

      const toolResponse = response as { results: unknown[] };
      return {
        results: toolResponse.results,
        errors: [],
      };
    };

    try {
      return await this.executeWithRetry('executeTool', callExecuteToolApi);
    } catch (error) {
      this.log.error('Error occurred while calling executeTool API');
      return {
        results: [],
        errors: [
          {
            error: {
              message: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            },
            type: 'error',
          },
        ],
      };
    }
  };
}
