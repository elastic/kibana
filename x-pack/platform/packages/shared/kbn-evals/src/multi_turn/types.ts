/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import type { Example } from '../types';
import type { AgentBuilderConverseAttachment, ConverseStep } from '../utils/agent_builder_client';

/** One user turn, scripted in the example or chosen by a `nextMessage` callback. */
export interface ConversationTurnInput {
  /** Stable id. Matches per-turn expectations and names per-turn scores. */
  id: string;
  message: string;
  attachments?: AgentBuilderConverseAttachment[];
}

/** Ground truth for one turn, matched to the turn by `id`. */
export interface ConversationTurnExpectation {
  id: string;
  expected?: string;
  [key: string]: unknown;
}

/** Input of a multi-turn example: the scripted user turns, in order. */
export type MultiTurnInput = Record<string, unknown> & {
  turns: ConversationTurnInput[];
};

/** Ground truth of a multi-turn example: for the whole conversation, for selected turns, or both. */
export type MultiTurnExpected = Record<string, unknown> & {
  expected?: string;
  turns?: ConversationTurnExpectation[];
};

export type MultiTurnExample = Example<MultiTurnInput, MultiTurnExpected>;

export interface ConversationTurnResult {
  id: string;
  index: number;
  /** `scripted` when the message came from the example, `callback` when `nextMessage` chose it. */
  source: 'scripted' | 'callback';
  /** The user message as sent, or used as the answer to the prompts the agent was waiting on. */
  message: string;
  /** Whether the turn answered pending prompts instead of sending a new message. */
  answeredPrompts: boolean;
  response: string;
  steps: ConverseStep[];
  /** Prompts the agent asked the user at the end of this turn. */
  prompts: unknown[];
  /** Trace of this turn alone; each turn runs in its own root span. */
  traceId?: string;
  tokensUsed?: ChatCompletionTokenCount;
  durationMs: number;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  message: string;
  turnId: string;
}

export type ConversationStopReason = 'turns_exhausted' | 'stopped' | 'max_turns' | 'aborted';

export interface ConversationResult {
  conversationId?: string;
  turns: ConversationTurnResult[];
  /** The ordered user and assistant messages, for conversation-level judges. */
  messages: ConversationMessage[];
  stopReason: ConversationStopReason;
}

/** Chooses the next user turn from the turns so far; `undefined` ends the conversation. */
export type NextMessageFn = (context: {
  turns: readonly ConversationTurnResult[];
}) => ConversationTurnInput | undefined | Promise<ConversationTurnInput | undefined>;

/**
 * Builds answers to the prompts the agent is waiting on, using the next user turn. Returning
 * `undefined` or an empty object sends the turn as a normal message instead.
 */
export type RespondToPromptsFn = (
  prompts: readonly unknown[],
  nextTurn: ConversationTurnInput
) => Record<string, unknown> | undefined;
