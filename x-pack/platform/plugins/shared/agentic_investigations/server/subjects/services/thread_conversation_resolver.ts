/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { ConversationOriginType } from '@kbn/agent-builder-common';
import type {
  CallbackConversationResolver,
  ConversationPublicClient,
} from '@kbn/agent-builder-server';
import type { SubjectsService } from './subjects_service';

/** Continues the investigation that claimed a Slack thread when the agent is mentioned in it. */
export const createThreadConversationResolver = ({
  getSubjectsService,
  getConversationClient,
  logger,
}: {
  getSubjectsService: () => SubjectsService;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
  logger: Logger;
}): CallbackConversationResolver => {
  return async ({ origin, spaceId, request }) => {
    if (origin.type !== ConversationOriginType.Slack) {
      return undefined;
    }

    const conversationId = await getSubjectsService().findClaimHolder(
      { type: 'slack_thread', id: origin.external_conversation_id },
      spaceId
    );
    if (!conversationId) {
      return undefined;
    }

    // A holder the caller can't read was deleted or made private. Returning it would fail the
    // turn as not found, so the thread gets an ordinary answer instead.
    const conversations = await getConversationClient(request);
    const readable = await conversations.bulkGet([conversationId]);
    const investigation = readable.get(conversationId);
    if (!investigation) {
      logger.debug(
        `Investigation [${conversationId}] claims Slack thread [${origin.external_conversation_id}] but is not readable; not continuing it`
      );
      return undefined;
    }

    // The Relay names one agent for every turn, so the investigation keeps its own.
    return { conversationId, agentId: investigation.agent_id };
  };
};
