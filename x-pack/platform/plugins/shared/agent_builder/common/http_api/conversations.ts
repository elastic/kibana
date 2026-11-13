/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  UserMessageEvent,
  ConversationAccessControl,
  ConversationAccessControlEntryInput,
  ConversationAccessControlMode,
  ConversationAddEventInput,
  ConversationEvent,
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

export type SearchConversationsResponse = ListConversationsResponse;

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

/** A message for the agent that currently runs on the conversation (internal `_steer` route). */
export interface SteerConversationRequestBody {
  message: string;
  /** Client-generated id: a retry after a lost response stores nothing twice. */
  event_id: string;
}

/**
 * The stored message, stamped with the run that will read it. A refusal is an error whose code
 * says why: no active execution, awaiting a prompt, not steerable, too many pending.
 */
export interface SteerConversationResponse {
  event: UserMessageEvent;
  /** Present and true when an earlier request already stored this `event_id`. */
  already_stored?: boolean;
}

export interface UpdateConversationAccessControlRequestBody {
  access_mode: ConversationAccessControlMode;
  entries: ConversationAccessControlEntryInput[];
}

export type UpdateConversationAccessControlResponse = ConversationAccessControl;

export interface AddConversationEventsRequestBody {
  events: ConversationAddEventInput[];
}

export interface AddConversationEventsResponse {
  events: ConversationEvent[];
}
