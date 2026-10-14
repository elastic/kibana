/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationResolver } from '@kbn/agent-builder-server';
import type { InvestigationSubjectKey } from '../../../common/subjects/subject';
import type { SubjectClaimDocument } from '../storage/subject_storage';

const SLACK_ORIGIN_TYPE = 'slack';

/**
 * Maps a Slack thread to the investigation that claimed it, by the Relay's thread key.
 * Only maps; Agent Builder checks the conversation and the caller's access.
 */
export const createSlackThreadConversationResolver = ({
  getClaim,
}: {
  getClaim: (
    spaceId: string,
    subject: InvestigationSubjectKey
  ) => Promise<SubjectClaimDocument | undefined>;
}): ConversationResolver => ({
  id: 'agentic_investigations.slack_thread',
  resolve: async ({ origin, spaceId }) => {
    if (origin.type !== SLACK_ORIGIN_TYPE) {
      return { status: 'unbound' };
    }
    try {
      const claim = await getClaim(spaceId, {
        type: 'slack_thread',
        id: origin.external_conversation_id,
      });
      return claim
        ? { status: 'held', conversationId: claim.conversationId }
        : { status: 'unbound' };
    } catch {
      return { status: 'unavailable', reason: 'lookup_failed' };
    }
  },
});
