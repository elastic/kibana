/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationRound,
  AgentCapabilities,
  AssistantResponse,
  AgentConfigurationOverrides,
} from '@kbn/agent-builder-common';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import type { PromptRequest, PromptResponse } from '@kbn/agent-builder-common/agents';

/**
 * Runtime configuration overrides exposed via the converse API.
 * Limited to instructions and tools - other fields from AgentConfigurationOverrides
 * (like research/answer step configs) are internal implementation details.
 */
export type ChatConfigurationOverrides = Pick<
  AgentConfigurationOverrides,
  'instructions' | 'tools'
>;

/**
 * body payload for request to the /internal/agent_builder/chat endpoint
 */
export interface ChatRequestBodyPayload {
  agent_id?: string;
  connector_id?: string;
  conversation_id?: string;
  capabilities?: AgentCapabilities;
  attachments?: AttachmentInput[];
  input?: string;
  prompts?: Record<string, PromptResponse>;
  browser_api_tools?: BrowserApiToolMetadata[];
  configuration_overrides?: ChatConfigurationOverrides;
}

export type ChatResponse = Omit<
  ConversationRound,
  'id' | 'input' | 'pending_prompt' | 'response' | 'state'
> & {
  conversation_id: string;
  round_id: string;
  response: Partial<AssistantResponse> & {
    prompt?: PromptRequest;
  };
};
