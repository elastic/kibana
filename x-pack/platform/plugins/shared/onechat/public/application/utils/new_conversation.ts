/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, ConversationRound } from '@kbn/onechat-common';
import { oneChatDefaultAgentId } from '@kbn/onechat-common';

export const newConversationId = 'new';
export const createNewConversation = (): Conversation => {
  const now = new Date().toISOString();
  return {
    id: newConversationId,
    agent_id: oneChatDefaultAgentId,
    user: { id: '', username: '' },
    title: '',
    created_at: now,
    updated_at: now,
    rounds: [],
  };
};

export const pendingRoundId = '__pending__';

export const createNewRound = ({
  userMessage,
  roundId = pendingRoundId,
}: {
  userMessage: string;
  roundId?: string;
}): ConversationRound => {
  return {
    id: roundId,
    input: { message: userMessage },
    response: { message: '' },
    steps: [],
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
