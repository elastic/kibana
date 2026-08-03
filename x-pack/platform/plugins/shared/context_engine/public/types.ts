/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';

/** Minimal, decoupled shape of an Agent Builder attachment input ({ type, data }). */
export interface ChatAttachmentInput {
  type: string;
  data: unknown;
}

/** Options for opening the Agent Builder chat, kept structurally compatible with
 * Agent Builder's `openChat` without importing it (Context Engine cannot depend on
 * Agent Builder — that would form a plugin dependency cycle). */
export interface OpenChatOptions {
  agentId?: string;
  newConversation?: boolean;
  autoSendInitialMessage?: boolean;
  initialMessage?: string;
  attachments?: ChatAttachmentInput[];
}

/** Opens the Agent Builder chat sidebar. Provided by a downstream plugin. */
export type ChatOpener = (options: OpenChatOptions) => void;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextEnginePluginSetup {}

export interface ContextEnginePluginStart {
  /**
   * Registers the function used to open the Agent Builder chat with attachments.
   * Called by `agent_builder_platform` (which can depend on Agent Builder) at start;
   * Context Engine's own UI then opens chat through it. This inversion avoids the
   * `agentBuilder → agentBuilderSml → contextEngine` dependency cycle.
   */
  registerChatOpener: (opener: ChatOpener) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextEngineSetupDependencies {}

export interface ContextEngineStartDependencies {
  share: SharePluginStart;
  data: DataPublicPluginStart;
  console?: ConsolePluginStart;
}
