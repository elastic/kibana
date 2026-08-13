/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { AiIndexHttpItem } from '../common/http_api/ai_indices';

/**
 * Context passed to the "Analyze & improve" chat opener: the AI index the user is looking at and,
 * optionally, the tag/group they are scoped to. The opener fetches the signals server-side; the
 * materialized signals are intentionally NOT passed so the opener always works from the
 * authoritative, complete set.
 */
export interface AnalyzeAndImproveContext {
  aiIndex: AiIndexHttpItem;
  /** The tag/group the action is scoped to, when drilled into a single group. */
  tag?: string;
}

/** Opens Agent Builder to analyze the given signals. Registered via {@link ContextEnginePluginStart.registerChatOpener}. */
export type ChatOpener = (context: AnalyzeAndImproveContext) => void | Promise<void>;

/**
 * Agent Builder `openChat` options for an "Analyze & improve" hand-off, built by
 * {@link ContextEnginePluginStart.buildAnalyzeChat}. Context Engine owns this translation (the
 * attachments and the per-index conversation scoping) so the `agent_builder_platform` bridge stays
 * pure forwarding and there is a single source of truth for the wire contract.
 */
export interface AnalyzeChatOptions {
  /** The AI index's configured feedback agent, or `undefined` when none is set. */
  agentId?: string;
  /** Always start a fresh conversation for the hand-off. */
  newConversation: boolean;
  /** Per-index session so each AI index's analysis is its own conversation, not a shared one. */
  sessionTag: string;
  /**
   * Built-in attachments describing the index: a `text` summary plus one `workflow.yaml` attachment
   * (by value) per linked workflow the current user can read.
   */
  attachments: AttachmentInput[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextEnginePluginSetup {}

export interface ContextEnginePluginStart {
  /**
   * Registers the opener used by the "Analyze & improve" button. Until an opener is registered
   * the button is hidden.
   */
  registerChatOpener: (opener: ChatOpener) => void;
  /**
   * Translates an "Analyze & improve" context into Agent Builder `openChat` options. The
   * `agent_builder_platform` bridge calls this and forwards the result to `openChat`, so the
   * attachment wire contract lives here (in Context Engine) rather than being duplicated in the
   * bridge. Async because it fetches the linked workflows' YAML (as the current user) to attach
   * them by value.
   */
  buildAnalyzeChat: (context: AnalyzeAndImproveContext) => Promise<AnalyzeChatOptions>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextEngineSetupDependencies {}

export interface ContextEngineStartDependencies {
  data: DataPublicPluginStart;
  share: SharePluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  console?: ConsolePluginStart;
  spaces?: SpacesPluginStart;
}
