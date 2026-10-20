/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CallbackConversationResolver } from '@kbn/agent-builder-server';
import type { ConversationService } from '../../conversation';

/** Finds the conversation that already has the origin, reading as the caller. */
export const createDefaultConversationResolver =
  ({ conversations }: { conversations: ConversationService }): CallbackConversationResolver =>
  async ({ origin, request }) => {
    const client = await conversations.getScopedClient({ request });
    const conversation = await client.getByOrigin({
      external_conversation_id: origin.external_conversation_id,
    });

    return conversation ? { conversationId: conversation.id } : undefined;
  };
