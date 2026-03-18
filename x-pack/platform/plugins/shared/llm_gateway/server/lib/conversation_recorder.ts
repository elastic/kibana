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

const LLM_GATEWAY_AGENT_ID = 'platform.llm_gateway.agent';

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
 * Tracked conversations with their message fingerprints for prefix matching.
 * When a new request's messages start with the same prefix as a tracked conversation,
 * we know it's a continuation of the same session.
 */
interface TrackedConversation {
  conversationId: string;
  messageFingerprints: string[];
}

const trackedConversations: TrackedConversation[] = [];
const headerSessionToConversationId = new Map<string, string>();

/**
 * Records a chat completion exchange as a conversation round in the Agent Builder.
 * Groups rounds into conversations by:
 * 1. Checking session headers (x-opencode-session, x-session-id, x-conversation-id)
 * 2. Checking if the incoming messages are a prefix-continuation of a previous request
 *    (coding agents send the full history each time, so a new request's messages
 *    will start with the same messages as the previous request plus new ones)
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

    const match = findExistingConversation(request, messages);

    // When continuing a conversation, only use messages after the known prefix
    // to find the new user message — otherwise we'd duplicate earlier messages.
    const newMessages = match ? messages.slice(match.prefixLength) : messages;
    const userMessage = getLastUserMessage(newMessages) || getLastUserMessage(messages);
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

    if (match) {
      try {
        const existing = await client.get(match.conversationId);
        const hasNewUserMessage = !!getLastUserMessage(newMessages);

        let updatedRounds: ConversationRound[];
        if (!hasNewUserMessage && existing.rounds.length > 0) {
          // No new user message means this is a continuation of the same turn
          // (e.g. tool results came back, model is responding again).
          // Merge into the last round: accumulate tool call steps and update the response.
          const lastRound = existing.rounds[existing.rounds.length - 1];
          const mergedRound: ConversationRound = {
            ...lastRound,
            steps: [...lastRound.steps, ...round.steps],
            response: round.response,
            model_usage: {
              ...lastRound.model_usage,
              llm_calls: lastRound.model_usage.llm_calls + round.model_usage.llm_calls,
              input_tokens:
                lastRound.model_usage.input_tokens + round.model_usage.input_tokens,
              output_tokens:
                lastRound.model_usage.output_tokens + round.model_usage.output_tokens,
            },
          };
          updatedRounds = [...existing.rounds.slice(0, -1), mergedRound];
        } else {
          updatedRounds = [...existing.rounds, round];
        }

        await client.update({
          id: match.conversationId,
          rounds: updatedRounds,
        });
        updateTrackedConversation(match.conversationId, messages);
        return match.conversationId;
      } catch (e) {
        logger.debug(`Could not append to conversation ${match.conversationId}: ${e.message}`);
        // Fall through to create a new conversation
      }
    }

    const conversation = await client.create({
      agent_id: LLM_GATEWAY_AGENT_ID,
      title,
      rounds: [round],
    });

    trackNewConversation(request, conversation.id, messages);

    return conversation.id;
  } catch (error) {
    logger.error(`Failed to record conversation: ${error.message}`);
    return undefined;
  }
};

/**
 * Headers to check for a session identifier, in priority order.
 */
const SESSION_HEADERS = [
  'x-opencode-session',
  'x-session-id',
  'x-conversation-id',
] as const;

/**
 * Gets an explicit session ID from request headers, if present.
 */
const getHeaderSessionId = (request: KibanaRequest): string | undefined => {
  for (const header of SESSION_HEADERS) {
    const value = request.headers[header];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return undefined;
};

/**
 * Creates a compact fingerprint for a message (role + truncated content hash)
 * used for prefix matching across requests.
 */
const messageFingerprint = (msg: OpenAiMessage): string => {
  const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
  // Use first 100 chars as fingerprint — enough to distinguish messages
  // without storing the full content in memory
  return `${msg.role}:${content.slice(0, 100)}`;
};

/**
 * Finds an existing conversation that this request is a continuation of.
 * First checks session headers, then falls back to prefix matching on messages.
 */
const findExistingConversation = (
  request: KibanaRequest,
  messages: OpenAiMessage[]
): { conversationId: string; prefixLength: number } | undefined => {
  // Check explicit session headers first
  const headerSessionId = getHeaderSessionId(request);
  if (headerSessionId) {
    const conversationId = headerSessionToConversationId.get(headerSessionId);
    if (conversationId) {
      return { conversationId, prefixLength: 0 };
    }
  }

  // Fallback: check if this request's messages are a continuation of a tracked conversation.
  // The previous messages should be a prefix of the current messages.
  const currentFingerprints = messages.map(messageFingerprint);

  for (const tracked of trackedConversations) {
    if (tracked.messageFingerprints.length === 0) {
      continue;
    }
    if (tracked.messageFingerprints.length > currentFingerprints.length) {
      continue;
    }
    const isPrefix = tracked.messageFingerprints.every(
      (fp, i) => fp === currentFingerprints[i]
    );
    if (isPrefix) {
      return {
        conversationId: tracked.conversationId,
        prefixLength: tracked.messageFingerprints.length,
      };
    }
  }

  return undefined;
};

/**
 * Updates the tracked fingerprints for an existing conversation.
 */
const updateTrackedConversation = (
  conversationId: string,
  messages: OpenAiMessage[]
): void => {
  const tracked = trackedConversations.find((t) => t.conversationId === conversationId);
  if (tracked) {
    tracked.messageFingerprints = messages.map(messageFingerprint);
  }
};

/**
 * Tracks a newly created conversation for future prefix matching.
 */
const trackNewConversation = (
  request: KibanaRequest,
  conversationId: string,
  messages: OpenAiMessage[]
): void => {
  const headerSessionId = getHeaderSessionId(request);
  if (headerSessionId) {
    headerSessionToConversationId.set(headerSessionId, conversationId);
  }

  trackedConversations.push({
    conversationId,
    messageFingerprints: messages.map(messageFingerprint),
  });

  // Keep only the last 100 tracked conversations to bound memory usage
  if (trackedConversations.length > 100) {
    trackedConversations.shift();
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
