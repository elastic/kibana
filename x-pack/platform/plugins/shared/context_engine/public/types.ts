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
import type { AiIndexHttpItem, GetAiIndexResponse } from '../common/http_api/ai_indices';

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

/** Opens Agent Builder to analyze the given signals. */
export type ChatOpener = (context: AnalyzeAndImproveContext) => void | Promise<void>;

/** Options passed to Agent Builder `openChat` for an Analyze & improve hand-off. */
export interface AnalyzeChatOptions {
  /** Feedback agent to open. */
  agentId?: string;
  /** When true, start a new conversation. */
  newConversation: boolean;
  /** Session tag for this AI index's conversation. */
  sessionTag: string;
  /** First message of the conversation, stating what the agent is being asked to do. */
  initialMessage: string;
  /** When true, the initial message is sent without waiting for the user. */
  autoSendInitialMessage: boolean;
  /** Attachments passed to Agent Builder. */
  attachments: AttachmentInput[];
}

export interface SuggestAutomationParams {
  aiIndex: GetAiIndexResponse;
  onSaved: () => void;
}

/** Powers the Suggest automation button. Registered via {@link AgentBuilderIntegration}. */
export interface SuggestAutomationProvider {
  canSuggest: (params: { aiIndex: GetAiIndexResponse | undefined; isManaged: boolean }) => boolean;
  suggestAutomation: (params: SuggestAutomationParams) => void;
  /** Subscribe to successful save_automation tool results for an AI index. Returns unsubscribe. */
  subscribeToAutomationSaved: (aiIndexId: string, onSaved: () => void) => () => void;
}

/** Suggest-automation hooks registered by context_engine_agent_builder. */
export interface AgentBuilderIntegration {
  suggestAutomation: SuggestAutomationProvider;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextEnginePluginSetup {}

export interface ContextEnginePluginStart {
  /** Registers suggest-automation hooks used by the Context Engine UI. */
  registerAgentBuilderIntegration: (integration: AgentBuilderIntegration) => void;
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
