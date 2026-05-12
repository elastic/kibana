/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OpenConversationSidebarOptions } from '@kbn/agent-builder-browser';

export type { OpenConversationSidebarOptions };

export interface OpenSidebarInternalOptions extends OpenConversationSidebarOptions {
  /**
   * Conversation id to restore on open. The plugin persists it under the storage key
   * derived from the resolved sidebar config (`sessionTag`/`agentId`)
   */
  conversationId?: string;
}
