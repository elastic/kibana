/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { HookLifecycle, HookExecutionMode } from '@kbn/agent-builder-common';
import type {
  AgentConfiguration,
  ChatEvent,
  ChatEventType,
  ConversationRound,
  ConversationRoundOrigin,
  ExecutionStartedEvent,
  ExecutionTerminalEvent,
  PreExecutionWorkflowStepData,
} from '@kbn/agent-builder-common';
import type { ProcessedRoundInput } from '../processed_input';
import type { RunToolReturn } from '../runner';
import type { ToolCallSource } from '../runner/runner';
import type { ToolHandlerContext } from '../tools/handler';

export { HookLifecycle, HookExecutionMode };

interface AgentHookContextBase {
  request: KibanaRequest;
  abortSignal?: AbortSignal;
  agentId?: string;
}

export interface BeforeAgentHookContext extends AgentHookContextBase {
  nextInput: ProcessedRoundInput;
  /** 0 for the initial execution, 1+ for a resume (legacy history may not retain exact counts). */
  roundExecutionIndex?: number;
  /** Accumulated output of the pre-execution workflows that already ran for this round. */
  preExecutionWorkflow?: PreExecutionWorkflowStepData;
  /**
   * Id of the conversation this round belongs to. Absent for standalone (sub-agent) runs.
   * Present but ephemeral for `ai.agent` workflow steps that set neither `create-conversation`
   * nor `conversation_id`: those resolve a placeholder conversation that is never persisted, so
   * the id is safe to correlate a single round but not to key anything that must outlive it.
   */
  conversationId?: string;
}

interface ToolCallHookContextBase extends AgentHookContextBase {
  toolId: string;
  toolCallId: string;
  toolParams: Record<string, unknown>;
  source: ToolCallSource;
}

export type BeforeToolCallHookContext = ToolCallHookContextBase;
export interface AfterToolCallHookContext extends ToolCallHookContextBase {
  toolReturn: RunToolReturn;
  toolHandlerContext: ToolHandlerContext;
}

export interface AfterExecutionHookContext extends AgentHookContextBase {
  round: ConversationRound;
  conversationId?: string;
  /** Connector used by this execution, which may differ from a folded pending round's connector. */
  connectorId?: string;
  agentConfiguration: AgentConfiguration;
}

/**
 * Chat events `afterChatEvent` hooks can run on. Execution lifecycle events are conversation
 * timeline events, which are persisted, so they never go through hooks.
 */
export type HookableChatEvent = Exclude<ChatEvent, ExecutionStartedEvent | ExecutionTerminalEvent>;

/**
 * Chat event types an `afterChatEvent` hook can subscribe to. Message chunks are excluded: they
 * arrive hundreds of times per reply, and awaiting each one would stall streaming.
 */
export type HookableChatEventType = Exclude<HookableChatEvent['type'], ChatEventType.messageChunk>;

/**
 * Context of an `afterChatEvent` hook. `event` is the copy delivered to clients and written to the
 * execution document; the stored conversation never sees changes made to it.
 */
export interface AfterChatEventHookContext extends AgentHookContextBase {
  event: HookableChatEvent;
  /** Origin of the round's input, for example Slack. Absent for rounds sent from Kibana. */
  origin?: ConversationRoundOrigin;
  conversationId: string;
  executionId: string;
}

export interface HookContextByLifecycle {
  [HookLifecycle.beforeAgent]: BeforeAgentHookContext;
  [HookLifecycle.beforeToolCall]: BeforeToolCallHookContext;
  [HookLifecycle.afterToolCall]: AfterToolCallHookContext;
  [HookLifecycle.afterExecution]: AfterExecutionHookContext;
  [HookLifecycle.afterChatEvent]: AfterChatEventHookContext;
}

export type HookContext<E extends HookLifecycle = HookLifecycle> = HookContextByLifecycle[E];

/**
 * Define which return type each hook lifecycle supports.
 */
export interface HookHandlerResultByLifecycle {
  [HookLifecycle.beforeAgent]: {
    nextInput?: ProcessedRoundInput;
    preExecutionWorkflow?: PreExecutionWorkflowStepData;
  };
  [HookLifecycle.beforeToolCall]: {
    toolParams?: Record<string, unknown>;
  };
  [HookLifecycle.afterToolCall]: {
    toolReturn?: RunToolReturn;
  };
  [HookLifecycle.afterExecution]: Record<string, never>;
  [HookLifecycle.afterChatEvent]: {
    event?: HookableChatEvent;
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

/**
 * Registration options specific to a lifecycle.
 */
type HookLifecycleOptions<E extends HookLifecycle> = E extends HookLifecycle.afterChatEvent
  ? {
      /**
       * Chat event types this hook runs on. Only events of these types wait for hooks; every other
       * event goes through without delay.
       */
      eventTypes: HookableChatEventType[];
    }
  : unknown;

type BlockingHookRegistrationEntry<E extends HookLifecycle> = {
  mode: HookExecutionMode.blocking;
  handler: BlockingHookHandler<E>;
  /**
   * Optional timeout in milliseconds for this hook. If exceeded, execution fails.
   */
  timeout?: number;
} & HookLifecycleOptions<E>;

type NonBlockingHookRegistrationEntry<E extends HookLifecycle> = {
  mode: HookExecutionMode.nonBlocking;
  handler: NonBlockingHookHandler<E>;
} & HookLifecycleOptions<E>;

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
interface HookRegistrationsBundle {
  /**
   * Unique id for this bundle (used as prefix per lifecycle, e.g. `id-beforeToolCall`).
   */
  id: string;
  /**
   * Priority for all hooks in this bundle. Higher values run earlier.
   */
  priority?: number;
  hooks: {
    [K in HookLifecycle]?: HookRegistrationEntry<K>;
  };
}

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
  /**
   * Whether any `afterChatEvent` hook runs on chat events of the given type.
   */
  handles: (lifecycle: HookLifecycle.afterChatEvent, eventType: ChatEvent['type']) => boolean;
}

export interface AgentBuilderHooks {
  run: HooksServiceStart['run'];
}
