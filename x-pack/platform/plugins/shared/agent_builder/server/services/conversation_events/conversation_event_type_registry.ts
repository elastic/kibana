/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONVERSATION_EVENT_ID_DELIMITER,
  RESERVED_CONVERSATION_EVENT_TYPES,
} from '@kbn/agent-builder-common';
import type { ConversationEventTypeDefinition } from '@kbn/agent-builder-server/conversation_events';

export interface ConversationEventTypeRegistry {
  register(definition: ConversationEventTypeDefinition): void;
  has(type: string): boolean;
  get(type: string): ConversationEventTypeDefinition | undefined;
  list(): ConversationEventTypeDefinition[];
}

export const createConversationEventTypeRegistry = (): ConversationEventTypeRegistry => {
  return new ConversationEventTypeRegistryImpl();
};

class ConversationEventTypeRegistryImpl implements ConversationEventTypeRegistry {
  private definitions: Map<string, ConversationEventTypeDefinition> = new Map();

  register(definition: ConversationEventTypeDefinition) {
    const { type } = definition;
    if (this.definitions.has(type)) {
      throw new Error(`Conversation event type "${type}" already registered`);
    }
    if (type.includes(CONVERSATION_EVENT_ID_DELIMITER)) {
      throw new Error(
        `Conversation event type "${type}" must not contain "${CONVERSATION_EVENT_ID_DELIMITER}"`
      );
    }
    if ((RESERVED_CONVERSATION_EVENT_TYPES as readonly string[]).includes(type)) {
      throw new Error(`Conversation event type "${type}" is reserved and cannot be registered`);
    }
    this.definitions.set(type, definition);
  }

  has(type: string): boolean {
    return this.definitions.has(type);
  }

  get(type: string): ConversationEventTypeDefinition | undefined {
    return this.definitions.get(type);
  }

  list(): ConversationEventTypeDefinition[] {
    return [...this.definitions.values()];
  }
}
