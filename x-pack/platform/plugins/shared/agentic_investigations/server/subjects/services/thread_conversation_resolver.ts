/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationOriginType } from '@kbn/agent-builder-common';
import type { CallbackConversationResolver } from '@kbn/agent-builder-server';
import type { SubjectsService } from './subjects_service';

/** Continues the investigation that claimed a Slack thread when the agent is mentioned in it. */
export const createThreadConversationResolver = ({
  getSubjectsService,
}: {
  getSubjectsService: () => SubjectsService;
}): CallbackConversationResolver => {
  return async ({ origin, spaceId }) => {
    if (origin.type !== ConversationOriginType.Slack) {
      return undefined;
    }

    const conversationId = await getSubjectsService().findClaimHolder(
      { type: 'slack_thread', id: origin.external_conversation_id },
      spaceId
    );

    return conversationId ? { conversationId } : undefined;
  };
};
