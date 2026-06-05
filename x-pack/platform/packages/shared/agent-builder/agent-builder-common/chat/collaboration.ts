/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEvent } from './conversation';

export type ConversationMode = 'single' | 'group';

/**
 * B5 chat event persistence on a conversation.
 *
 * `events` is the canonical persisted chat store. Each `user_message` carries
 * {@link UserMessageEvent.user} — authorship lives on events, not a separate
 * `members[]` list.
 *
 * Team access for investigations uses Kibana **space** + **template** privileges
 * (see docs/agent_builder_option_b_access_model.md).
 */
export interface ConversationCollaborationFields {
  /** @deprecated Use template_snapshot.chat_mode. Kept for POC until B2 create-from-template. */
  conversation_mode?: ConversationMode;
  events?: TimelineEvent[];
}
