/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationAction,
  ConversationAccessControl,
  ConversationRound,
  AssistantResponse,
  RuntimeAgentConfigurationOverrides,
} from '@kbn/agent-builder-common';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import type { PromptRequest, PromptResponse } from '@kbn/agent-builder-common/agents';
import type { ConversationWithPermissions } from './conversations';

/**
 * Body payload for the public agent_builder converse endpoints (`/api/agent_builder/converse`, `/converse/async`).
 */
export interface ChatRequestBodyPayload {
  agent_id?: string;
  connector_id?: string | null;
  inference_id?: string | null;
  conversation_id?: string;
  access_control?: Pick<ConversationAccessControl, 'access_mode'>;
  /** Applied when the round creates the conversation; ignored when continuing an existing one. */
  read_only?: boolean;
  execution_id?: string;
  attachments?: AttachmentInput[];
  input?: string;
  prompts?: Record<string, PromptResponse>;
  browser_api_tools?: BrowserApiToolMetadata[];
  configuration_overrides?: RuntimeAgentConfigurationOverrides;
  action?: ConversationAction;
  project_routing?: string;
  /** Force a specific execution mode. When omitted, the server auto-detects. */
  _execution_mode?: 'local' | 'task_manager';
  /** Use `never` to persist a message without executing the agent. */
  trigger_mode?: 'always' | 'never';
}

/**
 * Body payload for a context message request (`trigger_mode: 'never'`), which persists a message
 * on an existing conversation without executing the agent.
 */
export interface ContextMessagePayload
  extends Pick<ChatRequestBodyPayload, 'input' | 'attachments'> {
  trigger_mode: 'never';
  conversation_id: string;
}

export type ChatResponse = Omit<
  ConversationRound,
  'id' | 'input' | 'pending_prompts' | 'response' | 'state'
> & {
  conversation_id: string;
  access_control: ConversationAccessControl;
  round_id: string;
  response: Partial<AssistantResponse> & {
    prompts?: PromptRequest[];
  };
};

export type ChatConverseResponse = ConversationWithPermissions;
