/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import { createToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import type { AgentTurnItem, TimelineItem } from '../to_timeline_items';
import { createUserMessageEvent } from './user_message_event.factory';
import {
  createExecutionTerminatedEvent,
  createPromptRequestedTerminatedEvent,
} from './execution_terminated_event.factory';
import { createExecutionFailedEvent } from './execution_failed_event.factory';
import { createExecutionAbortedEvent } from './execution_aborted_event.factory';

type UserMessageItem = Extract<TimelineItem, { kind: 'userMessage' }>;

export const createUserMessageItem = (overrides?: Partial<UserMessageItem>): UserMessageItem => ({
  kind: 'userMessage',
  key: 'event-1',
  event: createUserMessageEvent(),
  ...overrides,
});

export const createAgentTurnItem = (overrides?: Partial<AgentTurnItem>): AgentTurnItem => ({
  kind: 'agentTurn',
  key: 'execution-1',
  status: 'completed',
  startedAt: '2026-09-03T11:17:39.000Z',
  steps: [],
  terminal: createExecutionTerminatedEvent(),
  response: { message: 'Here is a summary of your active hosts.' },
  ...overrides,
});

export const createCompletedTurnItem = (overrides?: Partial<AgentTurnItem>): AgentTurnItem =>
  createAgentTurnItem(overrides);

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
  key: 'execution-awaiting-1',
  status: 'awaiting_prompt',
  startedAt: '2026-09-03T11:17:39.000Z',
  steps: [
    createToolCallStep({
      tool_call_id: 'tc-awaiting-1',
      tool_id: 'delete_indices',
      params: {},
      results: [],
    }),
  ],
  terminal: createPromptRequestedTerminatedEvent({
    id: 'term-awaiting-1',
    execution_id: 'execution-awaiting-1',
  }),
  pendingPrompts: [
    {
      type: AgentPromptType.confirmation,
      id: 'prompt-1',
      title: 'Confirm action',
      message: 'The agent wants to delete 3 indices. Allow?',
    },
  ],
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
