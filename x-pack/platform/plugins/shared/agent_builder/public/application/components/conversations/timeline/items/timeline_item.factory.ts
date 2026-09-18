/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import type { AgentTurnItem, TimelineItem } from '../types';
import { createUserMessageEvent } from './user_message_event.factory';
import {
  createConfirmationPrompt,
  createExecutionPausedEvent,
} from './execution_paused_event.factory';
import { createExecutionFailedEvent } from './execution_failed_event.factory';
import { createExecutionAbortedEvent } from './execution_aborted_event.factory';

type UserMessageItem = Extract<TimelineItem, { kind: 'userMessage' }>;

export const createUserMessageItem = (overrides?: Partial<UserMessageItem>): UserMessageItem => ({
  kind: 'userMessage',
  key: 'event-1',
  event: createUserMessageEvent(),
  ...overrides,
});

export const createRunningTurnItem = (overrides?: Partial<AgentTurnItem>): AgentTurnItem => ({
  kind: 'agentTurn',
  key: 'execution-running-1',
  status: 'running',
  startedAt: '2026-09-03T11:17:39.000Z',
  steps: [],
  ...overrides,
});

export const createStreamingTurnItem = (overrides?: Partial<AgentTurnItem>): AgentTurnItem => ({
  kind: 'agentTurn',
  key: 'execution-streaming-1',
  status: 'running',
  startedAt: '2026-09-03T11:17:39.000Z',
  steps: [
    { type: ConversationRoundStepType.reasoning, reasoning: 'Looking at the available tools...' },
    { type: ConversationRoundStepType.reasoning, reasoning: 'Querying host metrics.' },
  ],
  response: { message: 'Here are the active hosts I found so far...' },
  timeToFirstToken: 320,
  ...overrides,
});

export const createAwaitingPromptTurnItem = (
  overrides?: Partial<AgentTurnItem>
): AgentTurnItem => ({
  kind: 'agentTurn',
  key: 'round-1::execution',
  executionId: 'round-1::execution',
  status: 'awaiting_prompt',
  startedAt: '2026-09-03T11:17:39.000Z',
  steps: [
    {
      type: ConversationRoundStepType.reasoning,
      reasoning: 'Need user confirmation before proceeding.',
    },
  ],
  terminal: createExecutionPausedEvent({
    id: 'round-1::execution_terminated',
    execution_id: 'round-1::execution',
  }),
  pendingPrompts: [createConfirmationPrompt()],
  ...overrides,
});

export const createFailedTurnItem = (overrides?: Partial<AgentTurnItem>): AgentTurnItem => ({
  kind: 'agentTurn',
  key: 'execution-failed-1',
  status: 'failed',
  startedAt: '2026-09-03T11:17:39.000Z',
  steps: [],
  terminal: createExecutionFailedEvent(),
  ...overrides,
});

export const createAbortedTurnItem = (overrides?: Partial<AgentTurnItem>): AgentTurnItem => ({
  kind: 'agentTurn',
  key: 'execution-aborted-1',
  status: 'aborted',
  startedAt: '2026-09-03T11:17:39.000Z',
  steps: [],
  terminal: createExecutionAbortedEvent(),
  ...overrides,
});
