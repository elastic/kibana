/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createConversationEventTypeRegistry,
  type ConversationEventTypeRegistry,
} from './conversation_event_type_registry';
import type { ConversationEventsServiceSetup, ConversationEventsServiceStart } from './types';
import { exampleNoteEventType } from './example_event_type';

export interface ConversationEventsService {
  setup: () => ConversationEventsServiceSetup;
  start: () => ConversationEventsServiceStart;
}

export const createConversationEventsService = (): ConversationEventsService => {
  return new ConversationEventsServiceImpl();
};

class ConversationEventsServiceImpl implements ConversationEventsService {
  readonly registry: ConversationEventTypeRegistry;

  constructor() {
    this.registry = createConversationEventTypeRegistry();
  }

  setup(): ConversationEventsServiceSetup {
    this.registry.register(exampleNoteEventType);

    return {
      register: (definition) => this.registry.register(definition),
    };
  }

  start(): ConversationEventsServiceStart {
    return {
      getDefinition: (type) => this.registry.get(type),
      list: () => this.registry.list(),
    };
  }
}
