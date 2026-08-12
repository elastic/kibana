/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Conversation,
  ConversationAccessControl,
  ConversationAccessControlEntry,
  ConversationAccessControlMode,
  ConversationWithoutRounds,
} from '@kbn/agent-builder-common';

export interface ConversationPermissions {
  rename: boolean;
  delete: boolean;
  update_access_control: boolean;
}

export type ConversationWithPermissions = Conversation & {
  permissions: ConversationPermissions;
};

export type ConversationWithoutRoundsWithPermissions = ConversationWithoutRounds & {
  permissions: ConversationPermissions;
};

export type GetConversationResponse = ConversationWithPermissions;

export type ListConversationsResponseItem = ConversationWithoutRoundsWithPermissions;

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

export interface GetConversationAccessControlResponse {
  access_control: ConversationAccessControl;
  permissions: Pick<ConversationPermissions, 'update_access_control'>;
}

export interface UpdateConversationAccessControlRequestBody {
  access_mode: ConversationAccessControlMode;
  entries: Array<Omit<ConversationAccessControlEntry, 'added_at'>>;
}

export type UpdateConversationAccessControlResponse = ConversationAccessControl;
