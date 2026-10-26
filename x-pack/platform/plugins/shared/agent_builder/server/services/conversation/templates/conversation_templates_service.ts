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

export interface ConversationTemplatesServiceSetup {
  register(template: ConversationTemplate): void;
}

export interface ConversationTemplatesServiceStart {
  get(id: string): Promise<ConversationTemplate | undefined>;
  getMany(ids: string[]): Promise<Map<string, ConversationTemplate>>;
  list(): Promise<ConversationTemplate[]>;
}

export class ConversationTemplatesService {
  private readonly registry: ConversationTemplateRegistry = createConversationTemplateRegistry();

  setup(): ConversationTemplatesServiceSetup {
    return {
      register: (template) => this.registry.register(template),
    };
  }

  start(): ConversationTemplatesServiceStart {
    return {
      get: (id) => this.registry.get(id),
      getMany: (ids) => this.registry.getMany(ids),
      list: () => this.registry.list(),
    };
  }
}
