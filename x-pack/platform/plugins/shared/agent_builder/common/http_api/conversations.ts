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

export interface SteerConversationResponse {
  event_id: string;
  /** The execution the message was stamped with. */
  execution_id: string;
  created_at: string;
  /** Present and true when an earlier request already stored this `event_id`. */
  already_stored?: boolean;
}

export type SteerConversationErrorCode =
  | 'not_steerable'
  | 'awaiting_prompt'
  | 'no_active_execution'
  | 'too_many_pending';

/** The body of a `409` / `429` refusal from the `_steer` route. */
export interface SteerConversationErrorBody {
  error: SteerConversationErrorCode;
  /** On `no_active_execution`: whether the steer was stored by an earlier request. */
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
