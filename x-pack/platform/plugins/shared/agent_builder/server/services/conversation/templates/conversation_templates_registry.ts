/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplate } from '@kbn/agent-builder-common';
import { validateTemplateDefinition } from './validation';

export interface ConversationTemplateRegistry {
  register(template: ConversationTemplate): void;
  has(id: string): Promise<boolean>;
  get(id: string): Promise<ConversationTemplate | undefined>;
  list(): Promise<ConversationTemplate[]>;
}

class ConversationTemplateRegistryImpl implements ConversationTemplateRegistry {
  private readonly templates = new Map<string, ConversationTemplate>();

  register(template: ConversationTemplate): void {
    validateTemplateDefinition(template);
    if (this.templates.has(template.id)) {
      throw new Error(
        `Conversation template with id "${template.id}" is already registered`
      );
    }
    this.templates.set(template.id, template);
  }

  async has(id: string): Promise<boolean> {
    return this.templates.has(id);
  }

  async get(id: string): Promise<ConversationTemplate | undefined> {
    return this.templates.get(id);
  }

  async list(): Promise<ConversationTemplate[]> {
    return [...this.templates.values()];
  }
}

export const createConversationTemplateRegistry = (): ConversationTemplateRegistry =>
  new ConversationTemplateRegistryImpl();
