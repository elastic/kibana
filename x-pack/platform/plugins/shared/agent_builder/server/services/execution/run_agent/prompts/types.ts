/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import type { ToolManager } from '@kbn/agent-builder-server/runner';
import type { ConversationTemplatesService } from '@kbn/agent-builder-server/runner/conversation_templates_service';
import type { ExperimentalFeatures } from '@kbn/agent-builder-server';
import type { RendererTypeDefinition } from '@kbn/agent-builder-server/renderers';
import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { ResolvedConfiguration } from '../types';
import type { ProcessedConversation } from '../utils/prepare_conversation';
import type { ToolCallResultTransformer } from '../utils/tool_summarization';
import type { ResearchAgentAction, AnswerAgentAction } from '../actions';
import type { RelevantSkillSelection } from '../utils/relevant_skills/select_relevant_skills';

/** Never call from the tool-result path — image bytes must not enter tool results. */
export type PromptImageResolver = (ref: {
  attachmentId: string;
  version?: number;
}) => Promise<{ base64: string; mimeType: string } | undefined>;

export interface PromptFactoryParams {
  configuration: ResolvedConfiguration;
  /**
   * Kibana space the conversation runs in. It never changes mid-conversation, so naming it in the
   * system prompt does not break prompt caching.
   */
  spaceId: string;
  processedConversation: ProcessedConversation;
  skills: InternalSkillDefinition[];
  /**
   * Tool manager, used by intra-round compaction to map tool ids and look up summarizers.
   */
  toolManager: ToolManager;
  /**
   * Transformer for tool call results in conversation history.
   * Used to summarize/substitute large results to optimize context.
   */
  resultTransformer: ToolCallResultTransformer;
  outputSchema?: Record<string, unknown>;
  conversationTimestamp: string;
  experimentalFeatures: ExperimentalFeatures;
  renderers: RendererTypeDefinition[];
  /**
   * Effective on/off for context-aware skill filtering this run: the `relevantSkills` flag AND a
   * dedicated fast model being configured. Gates the SKILLS section (static pointer vs full list) and
   * the `<relevant_skills>` notification — distinct from `experimentalFeatures.relevantSkills`, which
   * is only the flag.
   */
  relevantSkillsEnabled: boolean;
  relevantSkills?: RelevantSkillSelection;
  imageResolver?: PromptImageResolver;
  conversationTemplates: ConversationTemplatesService;
}

export interface ResearchAgentPromptRuntimeParams {
  cycleLimit: number;
  actions: ResearchAgentAction[];
}

export interface AnswerAgentPromptRuntimeParams {
  cycleLimit: number;
  actions: ResearchAgentAction[];
  answerActions: AnswerAgentAction[];
}

export interface PromptFactory {
  getMainPrompt(params: ResearchAgentPromptRuntimeParams): Promise<BaseMessageLike[]>;
  getStructuredAnswerPrompt(params: AnswerAgentPromptRuntimeParams): Promise<BaseMessageLike[]>;
}
