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
import type { ChatCompletionReasoningEffort } from '@kbn/inference-common';
import type { ConversationWithPermissions } from './conversations';

/**
 * Whether a chat request executes the agent. `never` appends the user message to an existing
 * conversation and returns, leaving the execution options unused.
 */
export enum ChatTriggerMode {
  Always = 'always',
  Never = 'never',
}

/**
 * Controls the shape of the synchronous `/converse` JSON response.
 * `simple` returns only `conversation_id` and the final assistant answer.
 * Ignored by `/converse/async` (streaming always emits full event SSE).
 */
export enum ChatResponseMode {
  Full = 'full',
  Simple = 'simple',
}

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
  /** Optional reasoning level forwarded to the inference plugin. */
  reasoning_level?: ChatCompletionReasoningEffort;
  /** Force a specific execution mode. When omitted, the server auto-detects. */
  _execution_mode?: 'local' | 'task_manager';
  /** Use `never` to persist a message without executing the agent. */
  trigger_mode?: ChatTriggerMode;
  /**
   * Synchronous `/converse` only. `simple` returns `{ conversation_id, answer }` instead of the
   * full round payload. Defaults to `full`.
   */
  response_mode?: ChatResponseMode;
}

/** Response of `POST /internal/agent_builder/executions/{id}/abort`. */
export interface AbortExecutionResponse {
  acknowledged: boolean;
  /** True when the run wound down and its `execution_aborted` event was saved before returning. */
  terminal_persisted: boolean;
}

/**
 * Body payload for a user message request (`trigger_mode: 'never'`), which persists a message
 * on an existing conversation without executing the agent.
 */
export interface UserMessagePayload extends Pick<ChatRequestBodyPayload, 'input' | 'attachments'> {
  trigger_mode: ChatTriggerMode.Never;
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

/**
 * Minimal synchronous `/converse` response when `response_mode: 'simple'`.
 */
export interface ChatSimpleResponse {
  conversation_id: string;
  /** Final assistant text for the completed round. Empty when the round ended without a message. */
  answer: string;
}

export type ChatConverseResponse = ConversationWithPermissions;
