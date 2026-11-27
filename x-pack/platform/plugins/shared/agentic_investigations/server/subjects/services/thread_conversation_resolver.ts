/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core/server';
import { ConversationOriginType } from '@kbn/agent-builder-common';
import type {
  CallbackConversationResolver,
  ConversationPublicClient,
} from '@kbn/agent-builder-server';
import { filterReadableConversationIds } from '../../investigations/services/readable_conversation_ids';
import type { SubjectsService } from './subjects_service';

/**
 * Continues the investigation that claimed a Slack thread when the agent is mentioned in it.
 * Refuses the turn when the claim's investigation was deleted or the caller cannot read it.
 */
export const createThreadConversationResolver = ({
  getSubjectsService,
  getConversationClient,
}: {
  getSubjectsService: () => SubjectsService;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
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

    const readable = await filterReadableConversationIds(await getConversationClient(request), [
      conversationId,
    ]);
    if (readable.length === 0) {
      const refusal = notFound("This investigation isn't available.");
      // Marks the message as meant for the person in the Slack thread, so Relay posts it there
      // instead of retrying the turn.
      refusal.output.headers['x-elastic-user-facing-error'] = 'true';
      throw refusal;
    }

    return { conversationId };
  };
};
