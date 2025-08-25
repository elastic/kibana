/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { HttpHandler } from '@kbn/core/public';
import { oneChatDefaultAgentId } from '@kbn/onechat-common';

type StringOrMessageList = string;

interface Options {
  agentId?: string;
}

interface ConverseFunctionParams {
  messages: StringOrMessageList;
  conversationId?: string;
  options?: Options;
}

type ConverseFunction = (params: ConverseFunctionParams) => Promise<{
  conversationId?: string;
  messages: string[];
  errors: any[];
}>;

export class OnechatEvaluationChatClient {
  constructor(
    private readonly fetch: HttpHandler,
    private readonly log: ToolingLog,
    private readonly connectorId: string
  ) {}

  converse: ConverseFunction = async ({ messages, conversationId, options = {} }) => {
    this.log.info('Calling converse');

    const { agentId = oneChatDefaultAgentId } = options;

    try {
      // Use the non-async OneChat API endpoint
      const response = await this.fetch('/api/chat/converse', {
        method: 'POST',
        version: '2023-10-31',
        body: JSON.stringify({
          agent_id: agentId,
          connector_id: this.connectorId,
          conversation_id: conversationId,
          input: messages,
        }),
      });

      // Extract conversation ID and response from the API response
      const chatResponse = response as {
        conversation_id: string;
        trace_id?: string;
        steps: any[];
        response: string;
      };
      const { conversation_id: conversationIdFromResponse, response: latestResponse } =
        chatResponse;

      return {
        conversationId: conversationIdFromResponse,
        messages: [messages, latestResponse],
        errors: [],
      };
    } catch (error) {
      this.log.error('Error occurred while calling converse API');
      return {
        conversationId,
        messages: [messages],
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
