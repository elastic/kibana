/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/onechat-common';

export type ConversationCreateRequest = Omit<
  Conversation,
  'id' | 'created_at' | 'updated_at' | 'user'
> & {
  id?: string;
};

export type ConversationUpdateRequest = Pick<Conversation, 'id'> &
  Partial<Pick<Conversation, 'title' | 'rounds' | 'connector_id'>>;

export interface ConversationListOptions {
  agentId?: string;
  spaceId?: string;
}

export interface ConversationGetOptions {
  conversationId: string;
}

export interface ConversationDeleteOptions {
  conversationId: string;
}
