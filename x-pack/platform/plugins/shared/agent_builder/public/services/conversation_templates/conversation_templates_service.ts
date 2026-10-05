/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationTemplateTabDefinition,
  ConversationTemplateUIDefinition,
} from '@kbn/agent-builder-browser';

export class ConversationTemplatesService {
  private readonly tabs: Map<string, ConversationTemplateTabDefinition> = new Map();
  private readonly templates: Map<string, ConversationTemplateUIDefinition> = new Map();

  registerTab(tabId: string, definition: ConversationTemplateTabDefinition): void {
    if (this.tabs.has(tabId)) {
      throw new Error(`Conversation template tab "${tabId}" is already registered.`);
    }
    this.tabs.set(tabId, definition);
  }

  getTab(tabId: string): ConversationTemplateTabDefinition | undefined {
    return this.tabs.get(tabId);
  }

  registerTemplateUIDefinition(
    templateId: string,
    definition: ConversationTemplateUIDefinition
  ): void {
    if (this.templates.has(templateId)) {
      throw new Error(`Conversation template "${templateId}" already has a UI definition.`);
    }
    this.templates.set(templateId, definition);
  }

  getTemplateUIDefinition(templateId: string): ConversationTemplateUIDefinition | undefined {
    return this.templates.get(templateId);
  }
}
