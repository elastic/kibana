/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationAccessControl,
  ConversationAccessControlEntry,
  ConversationAccessControlMode,
  Conversation,
  ConversationWithoutRounds,
} from '@kbn/agent-builder-common';
import type { WithPermissions } from './permissions';

export type GetConversationResponse = WithPermissions<Conversation>;

export type ListConversationsResponseItem = WithPermissions<ConversationWithoutRounds>;

export interface ListConversationsResponse {
  results: ListConversationsResponseItem[];
}

export interface DeleteConversationResponse {
  success: boolean;
}

export interface RenameConversationResponse {
  id: string;
  title: string;
}

export interface MarkReadConversationResponse {
  id: string;
  read: boolean;
}

export interface MarkPinnedConversationResponse {
  id: string;
  pinned: boolean;
}

export interface UpdateConversationAccessControlRequestBody {
  access_mode: ConversationAccessControlMode;
  entries: Array<Omit<ConversationAccessControlEntry, 'added_at'>>;
}

export type UpdateConversationAccessControlResponse = ConversationAccessControl;
