/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderInternalService } from '../services';

export interface EmbeddableConversationDependencies {
  services: AgentBuilderInternalService;
  coreStart: CoreStart;
}

export interface EmbeddableConversationProps {
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
   * Combined with agentId to restore the correct conversation when the sidebar reopens.
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
   * Optional initial message content to use when starting a new conversation.
   * Only applies when creating a new conversation (not when restoring existing ones).
   * Use with `autoSendInitialMessage` to control whether this message is automatically sent.
   *
   * Example: 'Show me error logs from the last hour'
   */
  initialMessage?: string;
  /**
   * Whether to automatically send the initial message when starting a new conversation.
   * Only applies when creating a new conversation (not when restoring existing ones).
   * Requires `initialMessage` to be provided.
   *
   * @default false
   */
  autoSendInitialMessage?: boolean;
  /**
   * Optional attachments with lazy content loading.
   * Content will be fetched when starting a new conversation round.
   * It will be appended only if it has changed since previous conversation round.
   */
  attachments?: AttachmentInput[];

  /**
   * Browser API tools that the agent can use to interact with the page.
   * Tools are executed browser-side when the LLM requests them.
   *
   * Example:
   * ```typescript
   * browserApiTools: [{
   *   id: 'dashboard.config.update_title',
   *   description: 'Update the dashboard title',
   *   schema: z.object({
   *     title: z.string().describe('The new title')
   *   }),
   *   handler: async ({ title }) => {
   *     dashboardApi.updateTitle(title);
   *   }
   * }]
   * ```
   */
  browserApiTools?: Array<BrowserApiToolDefinition<any>>;
}

export interface EmbeddableConversationSidebarProps {
  onClose: () => void;
  ariaLabelledBy: string;
  /**
   * Callback to register sidebar control methods.
   * Used internally to update sidebar props and clear browser API tools.
   * @internal
   */
  onRegisterCallbacks?: (callbacks: {
    updateProps: (props: EmbeddableConversationProps) => void;
    resetBrowserApiTools: () => void;
  }) => void;
}

export type EmbeddableConversationInternalProps = EmbeddableConversationDependencies &
  EmbeddableConversationProps &
  EmbeddableConversationSidebarProps;
