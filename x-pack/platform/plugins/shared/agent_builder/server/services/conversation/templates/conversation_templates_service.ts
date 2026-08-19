/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplate } from '@kbn/agent-builder-common';
import {
  type ConversationTemplateRegistry,
  createConversationTemplateRegistry,
} from './conversation_templates_registry';

export interface ConversationTemplatesSetup {
  register(template: ConversationTemplate): void;
}

export interface ConversationTemplatesStart {
  get(id: string): Promise<ConversationTemplate | undefined>;
  list(): Promise<ConversationTemplate[]>;
}

export class ConversationTemplatesService {
  private readonly registry: ConversationTemplateRegistry = createConversationTemplateRegistry();

  setup(): ConversationTemplatesSetup {
    return {
      register: (template) => this.registry.register(template),
    };
  }

  start(): ConversationTemplatesStart {
    return {
      get: (id) => this.registry.get(id),
      list: () => this.registry.list(),
    };
  }
}
