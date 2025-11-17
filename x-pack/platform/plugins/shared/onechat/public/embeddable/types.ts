/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { OnechatInternalService } from '../services';

export interface EmbeddableConversationDependencies {
  services: OnechatInternalService;
  coreStart: CoreStart;
}

export interface EmbeddableConversationProps {
  /**
   * Explicit conversation ID to load a specific conversation.
   * Takes priority over sessionTag/agentId-based restoration.
   * If not provided, the flyout will attempt to restore the last conversation.
   */
  conversationId?: string;

  /**
   * Force starting a new conversation, ignoring any stored conversation IDs.
   * When true, a fresh conversation is always created.
   * @default false
   */
  newConversation?: boolean;

  /**
   * Session tag for conversation context. Used to maintain separate conversation
   * histories for different parts of the application.
   *
   * Examples:
   * - 'dashboard' - Conversations started from dashboard page
   * - 'search' - Conversations started from search interface
   * - 'observability' - Conversations in observability context
   *
   * Combined with agentId to restore the correct conversation when the flyout reopens.
   * @default 'default'
   */
  sessionTag?: string;

  /**
   * Specific agent ID to use for this conversation.
   * If not provided, uses the last selected agent from localStorage.
   *
   * Examples:
   * - 'platform.core.dashboard' - Dashboard agent
   * - 'platform.core.general' - General agent
   */
  agentId?: string;

  /**
   * Optional initial message to automatically send when starting a new conversation.
   * Only applies when creating a new conversation (not when restoring existing ones).
   *
   * Example: 'Show me error logs from the last hour'
   */
  initialMessage?: string;
}

export type EmbeddableConversationInternalProps = EmbeddableConversationDependencies &
  EmbeddableConversationProps;
