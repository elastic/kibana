/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, ConversationWithoutRounds } from '@kbn/agent-builder-common';

/**
 * Permissions the requesting user has on a conversation, resolved server-side so the client does
 * not have to re-derive ownership. Both actions are owner-only today, but they are kept separate so
 * rename can be loosened without an API break.
 */
export interface ConversationPermissions {
  rename_conversation: boolean;
  delete_conversation: boolean;
}

export type ConversationWithPermissions = Conversation & {
  permissions: ConversationPermissions;
};

export type ConversationWithoutRoundsWithPermissions = ConversationWithoutRounds & {
  permissions: ConversationPermissions;
};

export type GetConversationResponse = ConversationWithPermissions;

export interface ListConversationsResponse {
  results: ConversationWithoutRoundsWithPermissions[];
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
