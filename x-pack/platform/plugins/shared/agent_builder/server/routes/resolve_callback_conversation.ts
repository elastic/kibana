/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { ConversationOriginType, ConversationRoundStatus } from '@kbn/agent-builder-common';
import type { ChatCallbackRequestBodyPayload } from '../../common/http_api/chat_callback';
import type { ConversationResolverRegistry } from '../services/conversation_resolvers';
import type { ConversationConverseSummary } from '../services/conversation/client/client';

export interface ResolvedCallbackConversation {
  payload: ChatCallbackRequestBodyPayload;
  /** False when the turn runs on a conversation the thread is bound to, which must already exist. */
  autoCreateConversationWithId: boolean;
}

/** How long a thread lookup may hold the callback before the plain conversation is used. */
export const RESOLVE_TIMEOUT_MS = 2000;

const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> => {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Maps a Slack callback turn to the conversation its thread is bound to, running on that
 * conversation's stored agent. Reading the conversation as the caller enforces access and agent
 * use. Anything but a readable claimed conversation that has a round and is not running one keeps
 * today's plain-conversation behavior: a turn on a starting or running investigation would
 * overlap its run.
 */
export const resolveCallbackConversation = async ({
  payload,
  spaceId,
  conversationResolvers,
  getConversation,
  logger,
}: {
  payload: ChatCallbackRequestBodyPayload;
  spaceId: string;
  conversationResolvers: ConversationResolverRegistry;
  getConversation: (conversationId: string) => Promise<ConversationConverseSummary>;
  logger: Logger;
}): Promise<ResolvedCallbackConversation> => {
  const unresolved = { payload, autoCreateConversationWithId: true };
  const { origin } = payload;
  if (origin?.type !== ConversationOriginType.Slack) {
    return unresolved;
  }

  const resolved = await withTimeout(
    conversationResolvers.resolve({
      origin: { type: origin.type, external_conversation_id: origin.external_conversation_id },
      spaceId,
    }),
    RESOLVE_TIMEOUT_MS
  );
  const resolution =
    resolved === 'timeout' ? ({ status: 'unavailable', reason: 'timeout' } as const) : resolved;
  if (resolution.status === 'unavailable') {
    logger.warn(
      `Thread resolution unavailable (${resolution.reason}), using the plain conversation`
    );
    return unresolved;
  }
  if (resolution.status !== 'held') {
    return unresolved;
  }

  try {
    const {
      id,
      agent_id: agentId,
      has_rounds: hasRounds,
      status,
    } = await getConversation(resolution.conversationId);
    if (!hasRounds || status === ConversationRoundStatus.inProgress) {
      logger.debug(
        `Bound conversation [${id}] has no round yet or is running one, using the plain conversation`
      );
      return unresolved;
    }
    return {
      payload: { ...payload, conversation_id: id, agent_id: agentId },
      autoCreateConversationWithId: false,
    };
  } catch (error) {
    logger.warn(
      `Bound conversation [${resolution.conversationId}] is not usable by the caller, using the plain conversation: ${error.message}`
    );
    return unresolved;
  }
};
