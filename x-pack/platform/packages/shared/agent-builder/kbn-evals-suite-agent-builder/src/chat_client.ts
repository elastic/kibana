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

interface Options {
  agentId?: string;
  /**
   * When true, the client automatically answers any pending structured prompts
   * that the agent emits after each API call:
   *   - `ask_user_question` → selects the first option (`choice: [0]`)
   *   - `confirmation`      → allows (`allow: true`)
   *
   * The client loops until no unanswered prompts remain, merging all steps
   * from continuation calls into the final `steps[]` response. Callers see a
   * clean "send message → get response" interface with no prompt-ID handling.
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

      // Auto-answer pending structured prompts until none remain.
      // Pending prompts come from two places:
      //   - steps[]           → ask_user_question (unanswered)
      //   - response.prompts  → confirmation / authorization (tool pre-call gates)
      if (autoConfirm) {
        // autoConfirm only handles tool confirmation gates — it does not auto-answer
        // user questions or auto-authorize platform permissions.
        const collectPending = (
          _responseSteps: any[],
          responseMsg: { prompts?: any[] }
        ): Record<string, unknown> => {
          const autoPrompts: Record<string, unknown> = {};
          for (const prompt of responseMsg?.prompts ?? []) {
            if (prompt?.id && prompt.type === 'confirmation') {
              autoPrompts[prompt.id] = { allow: true };
            }
          }
          return autoPrompts;
        };

        let autoPrompts = collectPending(allSteps, lastResponse);

        while (Object.keys(autoPrompts).length > 0) {
          const continuation = (await this.fetch('/api/agent_builder/converse', {
            method: 'POST',
            version: '2023-10-31',
            body: JSON.stringify({
              agent_id: agentId,
              connector_id: this.connectorId,
              conversation_id: currentConversationId,
              prompts: autoPrompts,
            }),
          })) as AgentBuilderConverseApiResponse;

          allSteps = [...allSteps, ...(continuation.steps ?? [])];
          lastResponse = continuation.response ?? lastResponse;
          currentConversationId = continuation.conversation_id ?? currentConversationId;

          autoPrompts = collectPending(continuation.steps ?? [], continuation.response);
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
