/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import type { ResolvedAgentCapabilities } from '@kbn/agent-builder-common';
import type { IFileSystemStore } from '@kbn/agent-builder-server/runner/filesystem';
import type { ResolvedConfiguration } from '../../types';
import type { ProcessedConversation } from '../../utils/prepare_conversation';
import type { ResearchAgentAction, AnswerAgentAction } from '../actions';

export interface PromptFactoryParams {
  configuration: ResolvedConfiguration;
  capabilities: ResolvedAgentCapabilities;
  processedConversation: ProcessedConversation;
  filesystem: IFileSystemStore;
  outputSchema?: Record<string, unknown>;
  conversationTimestamp: string;
}

export interface ResearchAgentPromptRuntimeParams {
  initialMessages: BaseMessageLike[];
  actions: ResearchAgentAction[];
}

export interface AnswerAgentPromptRuntimeParams {
  initialMessages: BaseMessageLike[];
  actions: ResearchAgentAction[];
  answerActions: AnswerAgentAction[];
}

export interface PromptFactory {
  getMainPrompt(params: ResearchAgentPromptRuntimeParams): Promise<BaseMessageLike[]>;
  getAnswerPrompt(params: AnswerAgentPromptRuntimeParams): Promise<BaseMessageLike[]>;
  getStructuredAnswerPrompt(params: AnswerAgentPromptRuntimeParams): Promise<BaseMessageLike[]>;
}
