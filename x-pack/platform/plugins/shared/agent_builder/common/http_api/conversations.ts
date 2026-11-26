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

export interface SteerConversationRequestBody {
  message: string;
  /** Client-generated idempotency key. */
  event_id: string;
}

/** Returns the canonical stored event. */
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

export interface CreateThreadRequest {
  client_thread_id: string;
  cut_event_id?: string;
  highlight?: { text: string };
  title?: string;
  trigger?: 'always' | 'never';
  connector_id?: string | null;
  inference_id?: string | null;
  project_routing?: string;
  reasoning_level?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
}

export interface CreateThreadResponse {
  thread_id: string;
  /** The first run, or on a resend the run still in progress. */
  execution_id?: string;
  conversation: ConversationWithPermissions;
}
