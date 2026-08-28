/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationRound,
  ConversationRoundAuthor,
  ConversationRoundStep,
} from '@kbn/agent-builder-common';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ConversationWithPermissions } from '../../../common/http_api/conversations';

export const createNewConversation = ({
  id,
  agentId,
}: {
  id: string;
  agentId: string;
}): ConversationWithPermissions => {
  const now = new Date().toISOString();
  return {
    id,
    agent_id: agentId,
    user: { id: '', username: '' },
    title: '',
    created_at: now,
    updated_at: now,
    rounds: [],
    permissions: { rename: true, delete: true, update_access_control: true },
  };
};

export const pendingRoundId = '__pending__';

export interface OptimisticConversationRound extends ConversationRound {
  authorProfile?: UserProfileWithAvatar;
}

export const createNewRound = ({
  userMessage,
  author,
  authorProfile,
  attachments,
  roundId = pendingRoundId,
  steps = [],
}: {
  userMessage: string;
  author?: ConversationRoundAuthor;
  authorProfile?: UserProfileWithAvatar;
  attachments?: Attachment[];
  roundId?: string;
  steps?: ConversationRoundStep[];
}): OptimisticConversationRound => {
  return {
    id: roundId,
    status: ConversationRoundStatus.inProgress,
    input: { message: userMessage, attachments },
    author,
    authorProfile,
    response: { message: '' },
    steps,
    started_at: new Date().toISOString(),
    time_to_first_token: 0,
    time_to_last_token: 0,
    model_usage: {
      connector_id: 'unknown',
      input_tokens: 0,
      output_tokens: 0,
      llm_calls: 0,
    },
  };
};
