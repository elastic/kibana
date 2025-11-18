/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { CoreStart } from '@kbn/core/public';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import type { AgentBuilderInternalService } from '../services';

export interface EmbeddableConversationDependencies {
  services: AgentBuilderInternalService;
  coreStart: CoreStart;
}

export type AttachmentsGetContent = () => MaybePromise<Record<string, unknown>>;

export interface UiAttachment {
  id: string;
  type: string;
  getContent: AttachmentsGetContent;
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
  /**
   * Optional attachments with lazy content loading.
   * Content will be fetched when starting a new conversation round.
   * It will be appended only if it has changed since previous conversation round.
   */
  attachments?: UiAttachment[];

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

export interface EmbeddableConversationFlyoutProps {
  onClose: () => void;
  ariaLabelledBy: string;
}

export type EmbeddableConversationInternalProps = EmbeddableConversationDependencies &
  EmbeddableConversationProps &
  EmbeddableConversationFlyoutProps;
