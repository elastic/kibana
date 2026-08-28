/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type { IconType } from '@elastic/eui';
import type { Conversation } from '@kbn/agent-builder-common';

/**
 * Props passed to a conversation template tab's `content` component.
 */
export interface ConversationTemplateTabRenderProps {
  /** The conversation the flyout is showing. */
  conversation: Conversation;
}

/**
 * A reusable conversation flyout tab, registered once and referenced by id from any
 * number of template UI definitions.
 */
export interface ConversationTemplateTabDefinition {
  /** Localized display label for the tab. */
  label: string;
  /**
   * Tab body. Rendered as a component so it may use hooks.
   *
   * Must be self-contained: capture your plugin's services in a closure at registration and
   * mount any providers you need inside this component. The flyout can render outside any
   * `KibanaContextProvider`, so ambient context (`useKibana()` etc.) is not available.
   */
  content: ComponentType<ConversationTemplateTabRenderProps>;
}

/**
 * UI contributions for a conversation template. Tabs are referenced by id and resolved
 * at render time, so registration order across plugins does not matter.
 */
export interface ConversationTemplateUIDefinition {
  /** Localized display name for the template, shown in the conversation UI (e.g. title badge). */
  name: string;
  /** Optional icon shown alongside the name. */
  icon?: IconType;
  /** Tab ids rendered in this order. Ids with no registered tab are skipped. */
  tabs: readonly string[];
}

/**
 * Public API for registering conversation template UI.
 *
 * Tab ids are a global keyspace — prefix them with your plugin or solution name
 * (e.g. `security.entities`). Duplicate registration of a tab id or template id throws.
 */
export interface ConversationTemplateServiceStartContract {
  /**
   * Register a reusable flyout tab under a tab id.
   */
  registerTab(tabId: string, definition: ConversationTemplateTabDefinition): void;
  /**
   * Resolve a registered tab, if any.
   */
  getTab(tabId: string): ConversationTemplateTabDefinition | undefined;
  /**
   * Register the UI definition for a template: which tabs it shows, in which order.
   */
  registerTemplateUIDefinition(
    templateId: string,
    definition: ConversationTemplateUIDefinition
  ): void;
  /**
   * Resolve the UI definition for a template, if one has been registered.
   */
  getTemplateUIDefinition(templateId: string): ConversationTemplateUIDefinition | undefined;
}
