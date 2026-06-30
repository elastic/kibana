/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationWithoutRounds, UserMessageEvent } from '@kbn/agent-builder-common';

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

/** Response for PATCH conversation (title + metadata allowlist). */
export interface PatchConversationResponse {
  id: string;
  title?: string;
  template_id?: string;
  custom_fields?: Record<string, unknown>;
}

export interface AppendConversationMessageRequest {
  message: string;
  attachment_refs?: Array<{ attachment_id: string; version: number }>;
}

export interface AppendConversationMessageResponse {
  conversation_id: string;
  event: UserMessageEvent;
}

export interface MarkReadConversationResponse {
  id: string;
  read: boolean;
}
