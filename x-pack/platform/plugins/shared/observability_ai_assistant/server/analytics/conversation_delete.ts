/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema, EventTypeOpts } from '@kbn/core/server';

export type ConversationDeleteEvent = Record<string, never>;

const schema: RootSchema<ConversationDeleteEvent> = {};

export const conversationDeleteEventType = 'observability_ai_assistant_conversation_delete';

export const conversationDeleteEvent: EventTypeOpts<ConversationDeleteEvent> = {
  eventType: conversationDeleteEventType,
  schema,
};
