/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema, EventTypeOpts } from '@kbn/core/server';

export type ConversationDuplicateEvent = Record<string, never>;

const schema: RootSchema<ConversationDuplicateEvent> = {};

export const conversationDuplicateEventType = 'observability_ai_assistant_conversation_duplicate';

export const conversationDuplicateEvent: EventTypeOpts<ConversationDuplicateEvent> = {
  eventType: conversationDuplicateEventType,
  schema,
};
