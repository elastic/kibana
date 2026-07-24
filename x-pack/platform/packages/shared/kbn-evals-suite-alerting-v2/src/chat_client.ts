/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { HttpHandler } from '@kbn/core/public';
import type { KbnClient } from '@kbn/kbn-client';
import { agentBuilderDefaultAgentId, type Conversation } from '@kbn/agent-builder-common';
import type { PromptRequest, PromptResponse } from '@kbn/agent-builder-common/agents';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import pRetry from 'p-retry';

interface ConverseParams {
  /** Scripted user turn text to send as converse `input` (or as prompt answers). */
  messages: Array<{ message: string }>;
  conversationId?: string;
  /**
   * Answers to prompts the agent is currently awaiting (e.g. an `ask_user_question`),
   * keyed by prompt id. When provided, the request answers those pending prompts instead
   * of sending a new free-text `input` message — required to continue a conversation that
   * ended in the `awaiting_prompt` status.
   */
  promptResponses?: Record<string, PromptResponse>;
}

export interface ConverseResult {
  conversationId?: string;
  response: { message: string };
  errors: unknown[];
  steps?: unknown[];
  traceId?: string;
  /**
   * Structured prompts the agent asked the user to answer (e.g. `ask_user_question`
   * or `confirmation`). Present when the round ended in the `awaiting_prompt` status.
   * When non-empty, the conversation cannot be continued with a plain free-text turn —
   * the API requires the caller to answer these prompts by id.
   */
  prompts: PromptRequest[];
}

export class RuleManagementChatClient {
  constructor(
    private readonly fetch: HttpHandler,
    private readonly kbnClient: KbnClient,
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
        }
        this.log.warning(
          new Error(
            `${operationName} API call failed on attempt ${error.attemptNumber}; retrying...`,
            {
              cause: error,
            }
          )
        );
      },
    });
  }

  converse = async ({
    messages,
    conversationId,
    promptResponses,
  }: ConverseParams): Promise<ConverseResult> => {
    this.log.info('Calling converse');

    const callConverseApi = async (): Promise<ConverseResult> => {
      const response = await this.fetch('/api/agent_builder/converse', {
        method: 'POST',
        version: '2023-10-31',
        body: JSON.stringify({
          agent_id: agentBuilderDefaultAgentId,
          connector_id: this.connectorId,
          conversation_id: conversationId,
          // Answer pending prompts by id when provided; otherwise send the turn as a
          // normal user message.
          ...(promptResponses
            ? { prompts: promptResponses }
            : { input: messages[messages.length - 1].message }),
        }),
      });

      const chatResponse = response as {
        conversation_id: string;
        trace_id?: string;
        steps: unknown[];
        response: { message: string; prompts?: PromptRequest[] };
      };

      return {
        conversationId: chatResponse.conversation_id,
        response: { message: chatResponse.response.message },
        steps: chatResponse.steps,
        traceId: chatResponse.trace_id,
        prompts: chatResponse.response.prompts ?? [],
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
        prompts: [],
        response: {
          message:
            'This question could not be answered as an internal error occurred. Please try again.',
        },
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

  /**
   * Loads the persisted conversation (rounds + attachments). Used after converse so
   * evaluators can read the authoritative transcript from `rounds` rather than a
   * harness-synthesized message list.
   */
  getConversation = async (conversationId: string): Promise<Conversation> => {
    this.log.info(`Fetching conversation ${conversationId}`);

    const { data } = await this.executeWithRetry('getConversation', async () => {
      return this.kbnClient.request<Conversation>({
        method: 'GET',
        path: `/api/agent_builder/conversations/${conversationId}`,
      });
    });

    return data;
  };

  listAttachments = async (conversationId: string): Promise<VersionedAttachment[]> => {
    this.log.info(`Listing attachments for conversation ${conversationId}`);

    const { data } = await this.executeWithRetry('listAttachments', async () => {
      return this.kbnClient.request<{ results?: VersionedAttachment[] }>({
        method: 'GET',
        path: `/api/agent_builder/conversations/${conversationId}/attachments`,
      });
    });

    return data.results ?? [];
  };
}
