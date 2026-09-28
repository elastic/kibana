/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationEventTypeDefinition } from '@kbn/agent-builder-server/conversation_events';

export interface ConversationEventsServiceSetup {
  register(definition: ConversationEventTypeDefinition): void;
}

export interface ConversationEventsServiceStart {
  getDefinition(type: string): ConversationEventTypeDefinition | undefined;
  list(): ConversationEventTypeDefinition[];
}
