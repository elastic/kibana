/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound, ConversationRoundStep } from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ConversationWithPermissions } from '../../../common/http_api/conversations';

/**
 * Builds the client-side placeholder for a conversation the current user is starting. The user owns
 * it by definition, so rename and delete are granted here rather than waiting for the server
 * payload — the cache is authoritative while the first round streams.
 */
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
    permissions: { rename_conversation: true, delete_conversation: true },
  };
};

export const pendingRoundId = '__pending__';

export const createNewRound = ({
  userMessage,
  attachments,
  roundId = pendingRoundId,
  steps = [],
}: {
  userMessage: string;
  attachments?: Attachment[];
  roundId?: string;
  steps?: ConversationRoundStep[];
}): ConversationRound => {
  return {
    id: roundId,
    status: ConversationRoundStatus.inProgress,
    input: { message: userMessage, attachments },
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
