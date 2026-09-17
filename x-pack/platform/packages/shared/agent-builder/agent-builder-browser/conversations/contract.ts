/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationEvent, ConversationAddEventInput } from '@kbn/agent-builder-common';

export interface AddConversationEventsParams {
  conversationId: string;
  events: ConversationAddEventInput[];
}

export interface AddConversationEventsResult {
  events: ConversationEvent[];
}

/** Browser-side contract for conversation operations. */
export interface ConversationsServiceStartContract {
  /** Append custom events to a conversation. Requires converse access. */
  addEvents(params: AddConversationEventsParams): Promise<AddConversationEventsResult>;
}
