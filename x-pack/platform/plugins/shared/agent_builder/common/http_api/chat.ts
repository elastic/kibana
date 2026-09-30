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
import type { ChatTriggerMode } from '@kbn/agent-builder-common';
import type { ConversationWithPermissions } from './conversations';

export { ChatTriggerMode } from '@kbn/agent-builder-common';

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
}

/** Response of `POST /internal/agent_builder/executions/{id}/abort`. */
export interface AbortExecutionResponse {
  acknowledged: boolean;
  /** True when the run wound down and its `execution_aborted` event was saved before returning. */
  terminal_persisted: boolean;
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

/**
 * Body payload for `POST /api/chat/message`: one message to an agent, nothing else. The route
 * runs the agent non-interactively and answers with text only.
 */
export interface ChatMessageRequestBodyPayload {
  /** The user message to send to the agent. */
  message: string;
  /** The agent to send the message to. Defaults to the default Elastic AI agent. */
  agent_id?: string;
  /** An existing conversation to continue. When omitted, a new conversation is created. */
  conversation_id?: string;
}

/** A HITL prompt the agent raised during a `POST /api/chat/message` run, auto-declined because no user could answer it. */
export interface ChatMessageDeclinedPrompt {
  /** The tool whose call was declined. */
  tool_id: string;
  /** The explanation the agent received in place of the prompt. */
  message: string;
}

/** Response of `POST /api/chat/message`. */
export interface ChatMessageResponse {
  /** The conversation the message was added to: the one requested, or the one created for it. */
  conversation_id: string;
  /** The agent's final text answer. Empty when the agent finished without a message. */
  answer: string;
  /** HITL prompts auto-declined during the run; empty when the agent did not ask for any. */
  declined_prompts: ChatMessageDeclinedPrompt[];
}
