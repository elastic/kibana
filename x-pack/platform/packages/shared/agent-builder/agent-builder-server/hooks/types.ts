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
 * Determines when the hook is executed relative to the main agent execution flow.
 *
 * - blocking: executed before proceeding; errors abort the main agent execution.
 * - nonBlocking: executed in the background; errors are logged and do not abort.
 */
export enum HookExecutionMode {
  blocking = 'blocking',
  nonBlocking = 'nonBlocking',
}

interface AgentHookContextBase {
  agentId?: string;
  request: KibanaRequest;
  abortSignal?: AbortSignal;
}

interface ConversationRoundHookContextBase extends AgentHookContextBase {
  conversation: Conversation;
}

export interface BeforeConversationRoundHookContext extends ConversationRoundHookContextBase {
  nextInput: ConverseInput;
}

export interface AfterConversationRoundHookContext extends ConversationRoundHookContextBase {
  round: ConversationRound;
}

interface ToolCallHookContextBase extends AgentHookContextBase {
  conversationId?: string;
  toolId: string;
  toolCallId: string;
  toolParams: Record<string, unknown>;
  source: 'agent' | 'user' | 'mcp' | 'unknown';
}

export type BeforeToolCallHookContext = ToolCallHookContextBase;
export interface AfterToolCallHookContext extends ToolCallHookContextBase {
  toolReturn: RunToolReturn;
}

export interface HookContextByLifecycle {
  [HookLifecycle.beforeConversationRound]: BeforeConversationRoundHookContext;
  [HookLifecycle.afterConversationRound]: AfterConversationRoundHookContext;
  [HookLifecycle.beforeToolCall]: BeforeToolCallHookContext;
  [HookLifecycle.afterToolCall]: AfterToolCallHookContext;
}

export type HookContext<E extends HookLifecycle = HookLifecycle> = HookContextByLifecycle[E];

/**
 * Define which return type each hook lifecycle supports.
 */
export interface HookHandlerResultByLifecycle {
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

export type HookHandlerResult<E extends HookLifecycle = HookLifecycle> =
  HookHandlerResultByLifecycle[E];

export type BlockingHookHandler<E extends HookLifecycle = HookLifecycle> = (
  context: HookContext<E>
) => Promise<void | HookHandlerResult<E>> | void | HookHandlerResult<E>;

/**
 * Handler for non-blocking hooks. Non-blocking hooks run fire-and-forget; their return value is ignored.
 * They can't return context updates (use blocking hooks for that).
 */
type NonBlockingHookHandler<E extends HookLifecycle = HookLifecycle> = (
  context: HookContext<E>
) => void | Promise<void>;

interface BlockingHookRegistrationEntry<E extends HookLifecycle> {
  mode: HookExecutionMode.blocking;
  handler: BlockingHookHandler<E>;
  /**
   * Optional timeout in milliseconds for this hook. If exceeded, execution fails.
   */
  timeout?: number;
}

interface NonBlockingHookRegistrationEntry<E extends HookLifecycle> {
  mode: HookExecutionMode.nonBlocking;
  handler: NonBlockingHookHandler<E>;
}

type HookRegistrationEntry<E extends HookLifecycle> =
  | BlockingHookRegistrationEntry<E>
  | NonBlockingHookRegistrationEntry<E>;

/**
 * Single hook registration (one lifecycle event). When expanded from a bundle,
 */
export type HookRegistration<E extends HookLifecycle = HookLifecycle> = Pick<
  HookRegistrationsBundle,
  'id' | 'priority'
> &
  HookRegistrationEntry<E>;

/**
 * Bundle of hook registrations for one or more lifecycles in a single call.
 * id and priority apply to all entries in the bundle.
 */
type HookRegistrationsBundle = {
  /**
   * Unique id for this bundle (used as prefix per lifecycle, e.g. `id-beforeToolCall`).
   */
  id: string;
  /**
   * Priority for all hooks in this bundle. Higher values run earlier.
   */
  priority?: number;
} & {
  [K in HookLifecycle]?: HookRegistrationEntry<K>;
};

export interface HooksServiceSetup {
  /**
   * Register one or more lifecycle hooks in a single call.
   */
  register(bundle: HookRegistrationsBundle): void;
}

export interface HooksServiceStart {
  /**
   * Runs blocking hooks first (await), then runs non-blocking hooks with the updated context (fire-and-forget).
   * Returns the context as updated by blocking hooks.
   */
  run: <E extends HookLifecycle>(lifecycle: E, context: HookContext<E>) => Promise<HookContext<E>>;
}

export interface AgentBuilderHooks {
  run: HooksServiceStart['run'];
}
