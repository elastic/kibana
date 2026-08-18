/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type { Conversation } from '@kbn/agent-builder-common';

/**
 * A single tab contributed to the conversation metadata flyout for a template.
 */
export interface ConversationTemplateTabDefinition {
  /** Unique tab id within the template's definition. `timeline` and `attachments` are reserved. */
  tab: string;
  /** Localized display label for the tab. */
  label: string;
  /** Tab body. Rendered as a component so it may use hooks. */
  content: ComponentType<{ conversation: Conversation }>;
}

/**
 * UI contributions for a conversation template, keyed by template id at registration.
 */
export interface ConversationTemplateUIDefinition {
  /** Tabs rendered in the conversation metadata flyout, in registration order. */
  tabs: ConversationTemplateTabDefinition[];
}

/**
 * Public API for registering and resolving conversation template UI definitions.
 */
export interface ConversationTemplateServiceStartContract {
  /**
   * Register the UI definition for a template. Throws if the template id is already registered.
   */
  addTemplateUIDefinition(templateId: string, definition: ConversationTemplateUIDefinition): void;
  /**
   * Resolve the UI definition for a template, if one has been registered.
   */
  getTemplateUIDefinition(templateId: string): ConversationTemplateUIDefinition | undefined;
}
