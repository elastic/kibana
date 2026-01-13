/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  AgentCapabilities,
  Conversation,
  ConverseInput,
  ConversationRound,
} from '@kbn/agent-builder-common';
import type { RunToolReturn } from '@kbn/agent-builder-server';

/**
 * Lifecycle events that can trigger hooks.
 *
 * Note: this is intentionally scoped to server-side agent execution lifecycle.
 */
export enum HookEvent {
  onConversationRoundStart = 'onConversationRoundStart',
  onConversationRoundEnd = 'onConversationRoundEnd',
  preToolCall = 'preToolCall',
  postToolCall = 'postToolCall',
  onAgentRunStart = 'onAgentRunStart',
  onAgentRunEnd = 'onAgentRunEnd',
}

/**
 * Determines when the hook is executed relative to the main event flow.
 *
 * - blocking: executed before proceeding; errors abort the main event.
 * - parallel: executed in the background; errors are logged and do not abort.
 */
export enum HookExecutionMode {
  blocking = 'blocking',
  parallel = 'parallel',
}

export interface ConversationRoundStartHookContext {
  /**
   * Event name.
   */
  event: HookEvent.onConversationRoundStart;
  /**
   * Agent id that will handle this round.
   */
  agentId: string;
  /**
   * Conversation id for this round.
   */
  conversationId: string;
  /**
   * Current conversation state.
   */
  conversation: Conversation;
  /**
   * Input that will be used to start / resume the round.
   *
   * Blocking hooks may return an updated value via {@link HookHandlerResult.nextInput}.
   */
  nextInput: ConverseInput;
  /**
   * Optional capabilities requested by the caller.
   */
  capabilities?: AgentCapabilities;
  /**
   * Original request driving the operation.
   */
  request: KibanaRequest;
  /**
   * Optional abort signal; hook implementations should respect it where appropriate.
   */
  abortSignal?: AbortSignal;
  /**
   * Optional abort controller that can be used to cancel the triggering operation from within hooks.
   * Primarily used by parallel hooks to cancel an in-flight operation.
   */
  abortController?: AbortController;
}

export interface ConversationRoundEndHookContext {
  event: HookEvent.onConversationRoundEnd;
  agentId: string;
  conversationId: string;
  conversation: Conversation;
  round: ConversationRound;
  resumed: boolean;
  capabilities?: AgentCapabilities;
  request: KibanaRequest;
  abortSignal?: AbortSignal;
  abortController?: AbortController;
}

export interface ToolCallHookContextBase {
  toolId: string;
  toolCallId: string;
  toolParams: Record<string, unknown>;
  source: 'agent' | 'user' | 'mcp' | 'unknown';
  request: KibanaRequest;
  abortSignal?: AbortSignal;
  abortController?: AbortController;
}

export interface PreToolCallHookContext extends ToolCallHookContextBase {
  event: HookEvent.preToolCall;
  /**
   * Optional abort signal; hook implementations should respect it where appropriate.
   */
  abortSignal?: AbortSignal;
}

export interface PostToolCallHookContext extends ToolCallHookContextBase {
  event: HookEvent.postToolCall;
  toolReturn: RunToolReturn;
}

export interface AgentRunHookContextBase {
  agentId: string;
  request: KibanaRequest;
  abortSignal?: AbortSignal;
  abortController?: AbortController;
  runId: string;
  agentParams: unknown;
}

export interface AgentRunStartHookContext extends AgentRunHookContextBase {
  event: HookEvent.onAgentRunStart;
}

export interface AgentRunEndHookContext extends AgentRunHookContextBase {
  event: HookEvent.onAgentRunEnd;
  result: unknown;
}

export interface HookContextByEvent {
  [HookEvent.onConversationRoundStart]: ConversationRoundStartHookContext;
  [HookEvent.onConversationRoundEnd]: ConversationRoundEndHookContext;
  [HookEvent.preToolCall]: PreToolCallHookContext;
  [HookEvent.postToolCall]: PostToolCallHookContext;
  [HookEvent.onAgentRunStart]: AgentRunStartHookContext;
  [HookEvent.onAgentRunEnd]: AgentRunEndHookContext;
}

export type HookContext<E extends HookEvent = HookEvent> = HookContextByEvent[E];

export interface HookHandlerResultByEvent {
  [HookEvent.onConversationRoundStart]: {
    nextInput?: ConverseInput;
  };
  [HookEvent.onConversationRoundEnd]: {
    round?: ConversationRound;
  };
  [HookEvent.preToolCall]: {
    toolParams?: Record<string, unknown>;
  };
  [HookEvent.postToolCall]: {
    toolReturn?: RunToolReturn;
  };
  [HookEvent.onAgentRunStart]: Record<string, never>;
  [HookEvent.onAgentRunEnd]: Record<string, never>;
}

export type HookHandlerResult<E extends HookEvent = HookEvent> = HookHandlerResultByEvent[E] & {
  /**
   * Hook-specific arbitrary data for debugging/observability.
   * Currently not persisted.
   */
  data?: Record<string, unknown>;
};

export type HookHandler<E extends HookEvent = HookEvent> = (
  context: HookContext<E>
) => Promise<void | HookHandlerResult<E>> | void | HookHandlerResult<E>;

export interface HookRegistration<E extends HookEvent = HookEvent> {
  /**
   * Unique id used to manage and identify this hook.
   */
  id: string;
  event: E;
  mode: HookExecutionMode;
  /**
   * Optional priority for ordering hooks within the same event+mode.
   * Higher values run earlier.
   */
  priority?: number;
  description?: string;
  /**
   * Optional allowlist of agent ids for which this hook will run.
   */
  agentFilter?: string[];
  handler: HookHandler<E>;
}

export interface HooksServiceSetup {
  register: <E extends HookEvent>(registration: HookRegistration<E>) => void;
}

export interface HooksServiceStart {
  runBlocking: <E extends HookEvent>(event: E, context: HookContext<E>) => Promise<HookContext<E>>;
  runParallel: <E extends HookEvent>(event: E, context: HookContext<E>) => void;
}
