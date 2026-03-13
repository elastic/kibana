/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, ConversationWithoutRounds } from '@kbn/agent-builder-common';

export interface ListConversationsResponse {
  results: ConversationWithoutRounds[];
}

export interface DeleteConversationResponse {
  success: boolean;
}

export interface RenameConversationResponse {
  id: string;
  title: string;
}

export interface CreateConversationResponse {
  conversation: Conversation;
}

export interface UpdateConversationResponse {
  conversation: Conversation;
}

export interface HandoverConversationResponse {
  conversation: ConversationWithoutRounds;
}
