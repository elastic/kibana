/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationEventsServiceStartContract } from '@kbn/agent-builder-browser';
import type { ConversationEventsService } from './conversation_events_service';

export const createPublicConversationEventsContract = ({
  conversationEventsService,
}: {
  conversationEventsService: ConversationEventsService;
}): ConversationEventsServiceStartContract => {
  return {
    register: (definition) => conversationEventsService.register(definition),
    getUiDefinition: (type) => conversationEventsService.getUiDefinition(type),
    has: (type) => conversationEventsService.has(type),
    list: () => conversationEventsService.list(),
  };
};
