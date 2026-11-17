/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import type { Example, TaskContext } from '../types';
import type { AgentBuilderConverseAttachment, ConverseStep } from '../utils/agent_builder_client';

// ---------------------------------------------------------------------------
// Dataset contract
// ---------------------------------------------------------------------------

/** One user turn, scripted in the example or chosen by a `nextMessage` callback. */
export interface ConversationTurnInput {
  /** Unique within the example. Matches per-turn expectations and names per-turn scores. */
  id: string;
  message: string;
  attachments?: AgentBuilderConverseAttachment[];
}

/** One conversation of an example: an ordered exchange that shares context. */
export interface ConversationInput {
  /** Unique within the example, e.g. `session-1` or `measurement`. */
  id: string;
  turns: ConversationTurnInput[];
}

/** Persona and goal for a simulated user, read by {@link createSimulatedUser}. */
export interface SimulatedUserInput {
  instructions: string;
  /** Upper bound on the turns the simulated user adds to each conversation. */
  max_turns?: number;
}

/**
 * Input of a multi-turn example. Give either `turns` (one conversation) or `conversations`
 * (several, run in order). Conversations start fresh, but any state the target keeps outside a
 * conversation, such as memory, carries over unless a hook resets it.
 */
export type MultiTurnInput = Record<string, unknown> & {
  turns?: ConversationTurnInput[];
  conversations?: ConversationInput[];
  /**
   * Material the suite's hooks apply before the example, a conversation or a turn, such as
   * history or memory to load. The framework passes it to the hooks without reading it.
   */
  seeding_data?: unknown;
  simulated_user?: SimulatedUserInput;
};

/** Ground truth for one turn, matched by `id`. Any other keys are passed to the evaluator. */
export interface ConversationTurnExpectation {
  id: string;
  expected?: string;
  [key: string]: unknown;
}

/** Ground truth of a multi-turn example: for the whole interaction, for selected turns, or both. */
export type MultiTurnExpected = Record<string, unknown> & {
  expected?: string;
  turns?: ConversationTurnExpectation[];
};

export type MultiTurnExample = Example<MultiTurnInput, MultiTurnExpected>;

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

export interface TargetTurnRequest {
  turn: ConversationTurnInput;
  /** Answers to the prompts the agent is waiting on; sent instead of `turn.message`. */
  promptResponses?: Record<string, unknown>;
}

export interface TargetTurnReply {
  response: string;
  steps: ConverseStep[];
  /** Prompts the agent asked the user at the end of the turn. */
  prompts: unknown[];
  /** Every trace the target reported for the turn, in order. */
  traceIds: string[];
  tokensUsed?: ChatCompletionTokenCount;
}

/**
 * What the runner learns when it checks a failed turn against the target: the turn's reply,
 * that the turn never reached the target (so it can be sent again), or that it can't tell.
 */
export type ReconcileOutcome = TargetTurnReply | 'not_applied' | 'unknown';

/** One conversation with the system under evaluation. */
export interface TargetConversation {
  /** The target's own id for the conversation, when it has one. */
  id?: string;
  send(request: TargetTurnRequest): Promise<TargetTurnReply>;
  /**
   * Checks whether a turn that failed or timed out was applied. Without it, a failed turn ends
   * the conversation with an unknown outcome.
   */
  reconcile?(request: TargetTurnRequest): Promise<ReconcileOutcome>;
}

/** The system under evaluation: an Agent Builder agent, a model, or anything else that chats. */
export interface ConversationTarget {
  name: string;
  startConversation(params: {
    key: string;
    context: MultiTurnTaskContext;
  }): Promise<TargetConversation>;
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export interface ConversationTurnResult {
  id: string;
  /** Position of the turn in its conversation. */
  index: number;
  /** Id of the conversation (from the example) the turn belongs to. */
  conversationKey: string;
  /** `scripted` when the message came from the example, `callback` when `nextMessage` chose it. */
  source: 'scripted' | 'callback';
  /** The user message as sent, or used as the answer to the prompts the agent was waiting on. */
  message: string;
  answeredPrompts: boolean;
  response: string;
  steps: ConverseStep[];
  prompts: unknown[];
  /** The turn's last trace; each turn runs in its own root span. */
  traceId?: string;
  traceIds: string[];
  tokensUsed?: ChatCompletionTokenCount;
  durationMs: number;
  /** Set when the reply was read back from the target after the call itself failed. */
  recovered?: boolean;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  message: string;
  turnId: string;
  conversationKey: string;
}

export type ConversationStopReason = 'turns_exhausted' | 'stopped' | 'max_turns' | 'failed';

export interface ConversationResult {
  key: string;
  /** The target's id for the conversation, e.g. the Agent Builder conversation id. */
  conversationId?: string;
  turns: ConversationTurnResult[];
  messages: ConversationMessage[];
  stopReason: ConversationStopReason;
}

/**
 * Where a run failed. `agent_call` with outcome `unknown` means the target may have applied the
 * turn; the run stops instead of sending it again.
 */
export interface MultiTurnError {
  phase: 'setup' | 'agent_call' | 'next_message' | 'cleanup';
  message: string;
  outcome?: 'failed' | 'unknown';
  conversationKey?: string;
  turnId?: string;
}

/** Task output of a multi-turn example. */
export interface MultiTurnResult {
  status: 'completed' | 'failed';
  conversations: ConversationResult[];
  /** Every turn of every conversation, in the order they ran. */
  turns: ConversationTurnResult[];
  /** Every message of every conversation, in order. */
  messages: ConversationMessage[];
  /** Set when the run failed. The turns that completed before the failure are kept. */
  error?: MultiTurnError;
  /** Failures in cleanup hooks; they don't change `status`. */
  cleanupErrors?: string[];
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Callbacks and hooks
// ---------------------------------------------------------------------------

export interface MultiTurnTaskContext extends Partial<TaskContext> {
  example: MultiTurnExample;
}

export interface NextMessageContext {
  /** The turns of the current conversation so far. */
  turns: readonly ConversationTurnResult[];
  conversationKey: string;
  /** The example's input. The expected output is never passed. */
  input: MultiTurnInput;
}

/** Chooses the next user turn from the turns so far; `undefined` ends the conversation. */
export type NextMessageFn = (
  context: NextMessageContext
) => ConversationTurnInput | undefined | Promise<ConversationTurnInput | undefined>;

/**
 * Builds answers to the prompts the agent is waiting on, using the next user turn. Returning
 * `undefined` or an empty object sends the turn as a normal message instead.
 */
export type RespondToPromptsFn = (
  prompts: readonly unknown[],
  nextTurn: ConversationTurnInput
) => Record<string, unknown> | undefined;

/**
 * Suite-provided steps around a run. `beforeExample` runs before each example and repetition,
 * for example to clear memory and load `seeding_data`; it must wait until the data is
 * queryable. `afterExample` always runs, also after a failure.
 */
export interface MultiTurnHooks {
  beforeExample?: (context: MultiTurnTaskContext) => Promise<void> | void;
  beforeConversation?: (
    conversation: ConversationInput,
    context: MultiTurnTaskContext
  ) => Promise<void> | void;
  /** Runs before a turn is sent, e.g. to apply `seeding_data` meant for that turn. */
  beforeTurn?: (
    turn: ConversationTurnInput,
    context: MultiTurnTaskContext & { conversationKey: string }
  ) => Promise<void> | void;
  afterExample?: (result: MultiTurnResult, context: MultiTurnTaskContext) => Promise<void> | void;
}
