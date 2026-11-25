/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationEventTypeDefinition } from '@kbn/agent-builder-server/conversation_events';
import type { ConversationEventTypesService } from '@kbn/agent-builder-server/runner';

export interface ConversationEventsServiceSetup {
  register(definition: ConversationEventTypeDefinition): void;
}

/**
 * Read access to the registered event types. The shape is owned by the package
 * (`ConversationEventTypesService`) so the agent runtime and this service cannot drift.
 */
export type ConversationEventsServiceStart = ConversationEventTypesService;
