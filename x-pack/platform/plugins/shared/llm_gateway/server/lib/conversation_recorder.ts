/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import {
  ConversationRoundStatus,
  ConversationRoundStepType,
  type ConversationRound,
  type ToolCallStep,
} from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/server';
import type { OpenAiMessage } from './openai_format';

const LLM_GATEWAY_AGENT_ID = 'llm-gateway';

interface RecordConversationParams {
  request: KibanaRequest;
  agentBuilder: AgentBuilderPluginStart;
  logger: Logger;
  messages: OpenAiMessage[];
  assistantMessage: string;
  toolCalls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tokenUsage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  model: string;
  connectorId: string;
}

/**
 * Records a chat completion exchange as a conversation round in the Agent Builder.
 * Returns the conversation ID for the response header.
 */
export const recordConversation = async ({
  request,
  agentBuilder,
  logger,
  messages,
  assistantMessage,
  toolCalls,
  tokenUsage,
  model,
  connectorId,
}: RecordConversationParams): Promise<string | undefined> => {
  try {
    const client = await agentBuilder.conversations.getScopedClient({ request });

    const conversationIdHeader = request.headers['x-conversation-id'];
    const existingConversationId =
      typeof conversationIdHeader === 'string' ? conversationIdHeader : undefined;

    const userMessage = getLastUserMessage(messages);
    const title = userMessage?.slice(0, 100) || 'LLM Gateway conversation';
    const now = new Date().toISOString();

    const round = buildRound({
      userMessage: userMessage || '',
      assistantMessage,
      toolCalls,
      tokenUsage,
      model,
      connectorId,
      now,
    });

    if (existingConversationId) {
      const existing = await client.get(existingConversationId);
      await client.update({
        id: existingConversationId,
        rounds: [...existing.rounds, round],
      });
      return existingConversationId;
    }

    const conversation = await client.create({
      agent_id: LLM_GATEWAY_AGENT_ID,
      title,
      rounds: [round],
    });
    return conversation.id;
  } catch (error) {
    logger.error(`Failed to record conversation: ${error.message}`);
    return undefined;
  }
};

const getLastUserMessage = (messages: OpenAiMessage[]): string | undefined => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'user' && typeof msg.content === 'string') {
      return msg.content;
    }
  }
  return undefined;
};

const buildRound = ({
  userMessage,
  assistantMessage,
  toolCalls,
  tokenUsage,
  model,
  connectorId,
  now,
}: {
  userMessage: string;
  assistantMessage: string;
  toolCalls?: RecordConversationParams['toolCalls'];
  tokenUsage?: RecordConversationParams['tokenUsage'];
  model: string;
  connectorId: string;
  now: string;
}): ConversationRound => {
  const steps: ToolCallStep[] = (toolCalls ?? []).map((tc) => ({
    type: ConversationRoundStepType.toolCall,
    tool_call_id: tc.id,
    tool_id: tc.function.name,
    params: JSON.parse(tc.function.arguments || '{}'),
    results: [],
  }));

  return {
    id: uuidv4(),
    status: ConversationRoundStatus.completed,
    input: {
      message: userMessage,
    },
    steps,
    response: {
      message: assistantMessage,
    },
    started_at: now,
    time_to_first_token: 0,
    time_to_last_token: 0,
    model_usage: {
      connector_id: connectorId,
      llm_calls: 1,
      input_tokens: tokenUsage?.prompt_tokens ?? 0,
      output_tokens: tokenUsage?.completion_tokens ?? 0,
      model,
    },
  };
};
