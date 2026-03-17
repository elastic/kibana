/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationAction,
  ConversationRound,
  AgentCapabilities,
  AssistantResponse,
  RuntimeAgentConfigurationOverrides,
} from '@kbn/agent-builder-common';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import type { PromptRequest, PromptResponse } from '@kbn/agent-builder-common/agents';

/**
 * body payload for request to the /internal/agent_builder/chat endpoint
 */

/**
 * Attachments accepted by the converse APIs.
 *
 * Note: unlike conversation-level attachments, attachments sent in a chat message do not support `origin`.
 * The server route schema also forbids unknown keys.
 */
export type ConverseAttachmentInput = Omit<AttachmentInput, 'origin'> & {
  /** Not supported by the converse APIs (server forbids unknown keys). */
  origin?: never;
};

export interface ChatRequestBodyPayload {
  agent_id?: string;
  connector_id?: string;
  conversation_id?: string;
  capabilities?: AgentCapabilities;
  attachments?: ConverseAttachmentInput[];
  input?: string;
  prompts?: Record<string, PromptResponse>;
  browser_api_tools?: BrowserApiToolMetadata[];
  configuration_overrides?: RuntimeAgentConfigurationOverrides;
  action?: ConversationAction;
  /** Force a specific execution mode. When omitted, the server auto-detects. */
  _execution_mode?: 'local' | 'task_manager';
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
