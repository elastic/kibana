/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationAccessControl,
  ConversationAccessControlEntryInput,
  ConversationAccessControlMode,
  ConversationWithPermissions,
  ConversationWithoutRoundsWithPermissions,
} from '@kbn/agent-builder-common';

export type {
  ConversationPermissions,
  ConversationWithPermissions,
  ConversationWithoutRoundsWithPermissions,
} from '@kbn/agent-builder-common';

export type GetConversationResponse = ConversationWithPermissions;

export type ListConversationsResponseItem = ConversationWithoutRoundsWithPermissions;

export interface ListConversationsResponse {
  pagination: {
    total: number;
    page: number;
    per_page: number;
  };
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

export type CreateConversationResponse = ConversationWithPermissions;

export interface UpdateConversationAccessControlRequestBody {
  access_mode: ConversationAccessControlMode;
  entries: ConversationAccessControlEntryInput[];
}

export type UpdateConversationAccessControlResponse = ConversationAccessControl;
