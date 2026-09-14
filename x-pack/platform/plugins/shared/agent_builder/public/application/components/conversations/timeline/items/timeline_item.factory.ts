/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineItem } from '../group_timeline_events';
import { createUserMessageEvent } from './user_message.factory';
import { createPromptResponseEvent } from './prompt_response.factory';
import { createExecutionTerminatedEvent } from './execution_terminated.factory';
import { createExecutionFailedEvent } from './execution_failed.factory';
import { createExecutionAbortedEvent } from './execution_aborted.factory';

type UserMessageItem = Extract<TimelineItem, { kind: 'userMessage' }>;
type PromptResponseItem = Extract<TimelineItem, { kind: 'promptResponse' }>;
type AgentTurnItem = Extract<TimelineItem, { kind: 'agentTurn' }>;
type AgentFailedItem = Extract<TimelineItem, { kind: 'agentFailed' }>;
type AgentAbortedItem = Extract<TimelineItem, { kind: 'agentAborted' }>;
type AgentRunningItem = Extract<TimelineItem, { kind: 'agentRunning' }>;
type AgentActiveItem = Extract<TimelineItem, { kind: 'agentActive' }>;

export const createUserMessageItem = (overrides?: Partial<UserMessageItem>): UserMessageItem => ({
  kind: 'userMessage',
  key: 'event-1',
  event: createUserMessageEvent(),
  ...overrides,
});

export const createPromptResponseItem = (
  overrides?: Partial<PromptResponseItem>
): PromptResponseItem => ({
  kind: 'promptResponse',
  key: 'event-3',
  event: createPromptResponseEvent(),
  ...overrides,
});

export const createAgentTurnItem = (overrides?: Partial<AgentTurnItem>): AgentTurnItem => ({
  kind: 'agentTurn',
  key: 'execution-1',
  startedAt: '2026-09-03T11:17:39.000Z',
  steps: [],
  terminal: createExecutionTerminatedEvent(),
  ...overrides,
});

export const createAgentFailedItem = (overrides?: Partial<AgentFailedItem>): AgentFailedItem => ({
  kind: 'agentFailed',
  key: 'execution-failed-1',
  startedAt: '2026-09-03T11:17:39.000Z',
  terminal: createExecutionFailedEvent(),
  ...overrides,
});

export const createAgentAbortedItem = (
  overrides?: Partial<AgentAbortedItem>
): AgentAbortedItem => ({
  kind: 'agentAborted',
  key: 'execution-aborted-1',
  startedAt: '2026-09-03T11:17:39.000Z',
  terminal: createExecutionAbortedEvent(),
  ...overrides,
});

export const createAgentRunningItem = (
  overrides?: Partial<AgentRunningItem>
): AgentRunningItem => ({
  kind: 'agentRunning',
  key: 'execution-running-1',
  startedAt: '2026-09-03T11:17:39.000Z',
  steps: [],
  ...overrides,
});

export const createAgentActiveItem = (overrides?: Partial<AgentActiveItem>): AgentActiveItem => ({
  kind: 'agentActive',
  key: 'active',
  startedAt: '2026-09-03T11:17:39.000Z',
  draft: { status: 'running', steps: [], message: '' },
  ...overrides,
});
