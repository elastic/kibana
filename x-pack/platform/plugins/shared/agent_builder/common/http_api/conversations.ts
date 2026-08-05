/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/agent-builder-common';

export interface ConversationPermissions {
  rename: boolean;
  delete: boolean;
}

export type GetConversationResponse = Conversation & {
  permissions: ConversationPermissions;
};

export type ConversationListItem = Omit<GetConversationResponse, 'rounds'>;

export interface ListConversationsResponse {
  results: ConversationListItem[];
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
