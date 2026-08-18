/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplateUIDefinition } from '@kbn/agent-builder-browser';

export class ConversationTemplatesService {
  private readonly registry: Map<string, ConversationTemplateUIDefinition> = new Map();

  addTemplateUIDefinition(templateId: string, definition: ConversationTemplateUIDefinition): void {
    if (this.registry.has(templateId)) {
      throw new Error(`Conversation template "${templateId}" already has a UI definition.`);
    }
    this.registry.set(templateId, definition);
  }

  getTemplateUIDefinition(templateId: string): ConversationTemplateUIDefinition | undefined {
    return this.registry.get(templateId);
  }

  hasTemplateUIDefinition(templateId: string): boolean {
    return this.registry.has(templateId);
  }
}
