/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Conversation } from '@kbn/onechat-common';
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
