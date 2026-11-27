/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { ConversationOriginType } from '@kbn/agent-builder-common';
import type { OnBeforeNewConversationHook } from '@kbn/agent-builder-server';
import type { SubjectsService } from './subjects_service';

/**
 * Refuses a Slack mention that would open a new conversation in a thread an investigation claimed.
 * Agent Builder only opens one there when the caller cannot continue that investigation: it was
 * deleted, is not shared with them, or its agent is unavailable.
 */
export const createClaimedThreadAdmissionCheck =
  ({
    getSubjectsService,
  }: {
    getSubjectsService: () => SubjectsService;
  }): OnBeforeNewConversationHook =>
  async ({ origin, spaceId }) => {
    if (origin.type !== ConversationOriginType.Slack) {
      return;
    }

    const holder = await getSubjectsService().findClaimHolder(
      { type: 'slack_thread', id: origin.external_conversation_id },
      spaceId
    );
    if (!holder) {
      return;
    }

    const refusal = notFound("This investigation isn't available.");
    // Marks the message as meant for the person in the Slack thread, so Relay posts it there
    // instead of retrying the turn.
    refusal.output.headers['x-elastic-user-facing-error'] = 'true';
    throw refusal;
  };
