/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Conversation, ConverseInput, ConversationRound } from '@kbn/agent-builder-common';
import type { RunToolReturn } from '../runner';

/**
 * Lifecycle events that can trigger hooks.
 *
 * Note: this is intentionally scoped to server-side agent execution lifecycle.
 */
export enum HookLifecycle {
  beforeConversationRound = 'beforeConversationRound',
  afterConversationRound = 'afterConversationRound',
  beforeToolCall = 'beforeToolCall',
  afterToolCall = 'afterToolCall',
}

/**
 * Determines when the hook is executed relative to the main event flow.
 *
 * - blocking: executed before proceeding; errors abort the main event.
 * - nonBlocking: executed in the background; errors are logged and do not abort.
 */
export enum HookExecutionMode {
  blocking = 'blocking',
  nonBlocking = 'nonBlocking',
}

/**
 * Context for beforeConversationRound hooks.
 * Blocking hooks may only return an updated {@link HookHandlerResult.nextInput}.
 */
export interface BeforeConversationRoundHookContext {
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
   */
  nextInput: ConverseInput;
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
   * Primarily used by non-blocking hooks to cancel an in-flight operation.
   */
  abortController?: AbortController;
}

export interface AfterConversationRoundHookContext {
  agentId: string;
  conversationId: string;
  conversation: Conversation;
  round: ConversationRound;
  request: KibanaRequest;
  abortSignal?: AbortSignal;
  abortController?: AbortController;
}

export interface ToolCallHookContextBase {
  agentId?: string;
  conversationId?: string;
  toolId: string;
  toolCallId: string;
  toolParams: Record<string, unknown>;
  source: 'agent' | 'user' | 'mcp' | 'unknown';
  request: KibanaRequest;
  abortSignal?: AbortSignal;
  abortController?: AbortController;
}

/**
 * Context for beforeToolCall hooks. No model identifier (tool runs are model-agnostic).
 * Blocking hooks may only return updated {@link HookHandlerResult.toolParams}.
 */
export interface BeforeToolCallHookContext extends ToolCallHookContextBase {
  /**
   * Optional abort signal; hook implementations should respect it where appropriate.
   */
  abortSignal?: AbortSignal;
}

/**
 * Context for afterToolCall hooks. Blocking hooks may only return an updated {@link HookHandlerResult.toolReturn}.
 */
export interface AfterToolCallHookContext extends ToolCallHookContextBase {
  toolReturn: RunToolReturn;
}

export interface HookContextByEvent {
  [HookLifecycle.beforeConversationRound]: BeforeConversationRoundHookContext;
  [HookLifecycle.afterConversationRound]: AfterConversationRoundHookContext;
  [HookLifecycle.beforeToolCall]: BeforeToolCallHookContext;
  [HookLifecycle.afterToolCall]: AfterToolCallHookContext;
}

export type HookContext<E extends HookLifecycle = HookLifecycle> = HookContextByEvent[E];

/**
 * Define which return type each hook lifecycle supports.
 */
export interface HookHandlerResultByEvent {
  [HookLifecycle.beforeConversationRound]: {
    nextInput?: ConverseInput;
  };
  [HookLifecycle.afterConversationRound]: {
    round?: ConversationRound;
  };
  [HookLifecycle.beforeToolCall]: {
    toolParams?: Record<string, unknown>;
  };
  [HookLifecycle.afterToolCall]: {
    toolReturn?: RunToolReturn;
  };
}

/**
 * Explicit updatable shapes per event. Use these to see exactly what a hook may return.
 * @see HookHandlerResult
 */
export type BeforeConversationRoundHookUpdatable =
  HookHandlerResultByEvent[HookLifecycle.beforeConversationRound];
export type AfterConversationRoundHookUpdatable =
  HookHandlerResultByEvent[HookLifecycle.afterConversationRound];
export type BeforeToolCallHookUpdatable = HookHandlerResultByEvent[HookLifecycle.beforeToolCall];
export type AfterToolCallHookUpdatable = HookHandlerResultByEvent[HookLifecycle.afterToolCall];

export type HookHandlerResult<E extends HookLifecycle = HookLifecycle> =
  HookHandlerResultByEvent[E];

export type BlockingHookHandler<E extends HookLifecycle = HookLifecycle> = (
  context: HookContext<E>
) => Promise<void | HookHandlerResult<E>> | void | HookHandlerResult<E>;

/**
 * Handler for non-blocking hooks. Non-blocking hooks run fire-and-forget; their return value is ignored.
 * They must not return context updates (use blocking hooks for that).
 */
export type NonBlockingHookHandler<E extends HookLifecycle = HookLifecycle> = (
  context: HookContext<E>
) => void | Promise<void>;

/**
 * Blocking hook entry: runs sequentially and may return context updates.
 */
export interface BlockingHookRegistrationEntry<E extends HookLifecycle> {
  mode: HookExecutionMode.blocking;
  handler: BlockingHookHandler<E>;
  /**
   * Optional timeout in milliseconds for this hook. If exceeded, execution fails.
   * When not set, defaults to 3 minutes (180000ms).
   */
  timeout?: number;
}

/**
 * Non-blocking hook entry: runs fire-and-forget; return value is ignored.
 */
export interface NonBlockingHookRegistrationEntry<E extends HookLifecycle> {
  mode: HookExecutionMode.nonBlocking;
  handler: NonBlockingHookHandler<E>;
}

/**
 * Per-lifecycle entry in a bundle: mode and handler.
 * Blocking handlers may return context updates; non-blocking handlers must not.
 */
export type HookRegistrationEntry<E extends HookLifecycle> =
  | BlockingHookRegistrationEntry<E>
  | NonBlockingHookRegistrationEntry<E>;

export type HookRegistration<E extends HookLifecycle = HookLifecycle> = {
  /**
   * Unique id used to manage and identify this hook.
   */
  id: string;
  /**
   * Optional priority for ordering hooks within the same event+mode.
   * Higher values run earlier.
   */
  priority?: number;
  description?: string;
} & HookRegistrationEntry<E>;

/**
 * Union of all event-specific registrations. Use for typing arrays or when the event is dynamic.
 */
export type HookRegistrationInput = {
  [K in HookLifecycle]: HookRegistration<K>;
}[HookLifecycle];

/**
 * Bundle of hook registrations for one or more lifecycles in a single call.
 * id and priority apply to all entries in the bundle.
 * Each key is optional; only include the lifecycles you want to register.
 */
export type HookRegistrationsBundle = {
  /**
   * Unique id for this bundle (used as prefix per event, e.g. `id-beforeToolCall`).
   */
  id: string;
  /**
   * Optional priority for all hooks in this bundle. Higher values run earlier.
   */
  priority?: number;
  /**
   * Optional human-readable description for all hooks in this bundle.
   */
  description?: string;
} & {
  [K in HookLifecycle]?: HookRegistrationEntry<K>;
};

export interface HooksServiceSetup {
  /**
   * Register one or more lifecycle hooks in a single call.
   * Each handler is typed for its lifecycle (context and return type).
   */
  register(bundle: HookRegistrationsBundle): void;
}

export interface HooksServiceStart {
  /**
   * Runs blocking hooks first (await), then runs non-blocking hooks with the updated context (fire-and-forget).
   * Returns the context as updated by blocking hooks.
   */
  run: <E extends HookLifecycle>(event: E, context: HookContext<E>) => Promise<HookContext<E>>;
}

export interface AgentBuilderHooks {
  run: HooksServiceStart['run'];
}
