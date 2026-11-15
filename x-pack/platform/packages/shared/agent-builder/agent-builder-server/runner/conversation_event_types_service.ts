/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationEventTypeDefinition } from '../conversation_events';

/**
 * Read access to the custom conversation event types registered in agent builder,
 * used by the agent runtime to resolve how stored events are presented to the LLM.
 */
export interface ConversationEventTypesService {
  getDefinition(type: string): ConversationEventTypeDefinition | undefined;
  list(): ConversationEventTypeDefinition[];
}
