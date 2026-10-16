/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AgentExecutionService } from '@kbn/agent-builder-server/execution';
import type { ChatCallbackRequestBodyPayload } from '../../common/http_api/chat_callback';
import type { CallbackDeliveryService } from '../services/execution/callback';
import type { ConversationService } from '../services/conversation';

export interface CallbackTarget {
  payload: ChatCallbackRequestBodyPayload;
  /** False when the turn continues a conversation found by its origin, which must already exist. */
  autoCreateConversationWithId: boolean;
}

/**
 * Finds the conversation a callback turn continues from its origin, and runs the turn on that
 * conversation's agent. A replay is left to the execution service, which returns the execution it
 * already accepted. Without a match, the turn starts a conversation with the origin, as before.
 */
export const resolveCallbackTarget = async ({
  payload,
  spaceId,
  executionId,
  request,
  callbackDeliveryService,
  conversations,
  executionService,
}: {
  payload: ChatCallbackRequestBodyPayload;
  spaceId: string;
  executionId: string | undefined;
  request: KibanaRequest;
  callbackDeliveryService: Pick<CallbackDeliveryService, 'resolveOrigin'>;
  conversations: Pick<ConversationService, 'getScopedClient'>;
  executionService: Pick<AgentExecutionService, 'getExecution'>;
}): Promise<CallbackTarget> => {
  const unresolved = { payload, autoCreateConversationWithId: true };
  const { origin, conversation_id: conversationId } = payload;

  if (!origin || conversationId) {
    return unresolved;
  }

  if (executionId && (await executionService.getExecution(executionId))) {
    return unresolved;
  }

  const resolved = await callbackDeliveryService.resolveOrigin({
    origin: { type: origin.type, external_conversation_id: origin.external_conversation_id },
    spaceId,
    request,
  });

  if (!resolved) {
    return unresolved;
  }

  const client = await conversations.getScopedClient({ request });
  const { id, agent_id: agentId } = await client.get(resolved.conversationId);

  return {
    payload: { ...payload, conversation_id: id, agent_id: agentId },
    autoCreateConversationWithId: false,
  };
};
