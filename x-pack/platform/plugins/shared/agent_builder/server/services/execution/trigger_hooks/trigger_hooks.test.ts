/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type {
  ExecutionConversation,
  UserMessageEvent,
  AgentResponseEvent,
  TimelineEvent,
} from '@kbn/agent-builder-common';
import {
  ConversationMode,
  ConversationRoundStatus,
  TimelineEventType,
} from '@kbn/agent-builder-common';
import { singleUserTriggerHook } from './single_user_hook';
import { groupTriggerHook } from './group_hook';
import { getTriggerHookForMode } from './resolve';
import type { AgentTriggerHookContext } from './types';

const createTestContext = (): AgentTriggerHookContext => ({
  request: httpServerMock.createKibanaRequest(),
});

const createTestConversation = (
  mode: ConversationMode = ConversationMode.user,
  timeline: TimelineEvent[] = []
): ExecutionConversation => ({
  id: 'conv-1',
  agent_id: 'agent-1',
  user: { id: 'user-1', username: 'testuser' },
  title: 'test',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  timeline,
  conversation_mode: mode,
  execution_state: 'idle',
});

const createUserMessage = (message: string): UserMessageEvent => ({
  id: 'msg-1',
  timestamp: '2024-01-01T00:00:00.000Z',
  type: TimelineEventType.user_message,
  user: { id: 'user-1', username: 'testuser' },
  message,
});

const createAgentResponse = (): AgentResponseEvent => ({
  id: 'resp-1',
  timestamp: '2024-01-01T00:00:00.000Z',
  type: TimelineEventType.agent_response,
  agent_id: 'agent-1',
  status: ConversationRoundStatus.completed,
  steps: [],
  response: { message: 'hello' },
  started_at: '2024-01-01T00:00:00.000Z',
  time_to_first_token: 0,
  time_to_last_token: 0,
  model_usage: { connector_id: '', llm_calls: 0, input_tokens: 0, output_tokens: 0 },
});

/** A conversation that already has at least one agent response */
const createConversationWithHistory = (mode: ConversationMode): ExecutionConversation =>
  createTestConversation(mode, [createUserMessage('first'), createAgentResponse()]);

describe('trigger hooks', () => {
  describe('singleUserTriggerHook', () => {
    it('always returns invoke: true', async () => {
      const result = await singleUserTriggerHook(
        {
          conversation: createTestConversation(),
          newEvents: [createUserMessage('hello')],
        },
        createTestContext()
      );

      expect(result).toEqual({ invoke: true });
    });

    it('returns invoke: true even with no events', async () => {
      const result = await singleUserTriggerHook(
        {
          conversation: createTestConversation(),
          newEvents: [],
        },
        createTestContext()
      );

      expect(result).toEqual({ invoke: true });
    });
  });

  describe('groupTriggerHook', () => {
    it('returns invoke: true on first message (no prior agent response)', async () => {
      const result = await groupTriggerHook(
        {
          conversation: createTestConversation(ConversationMode.group),
          newEvents: [createUserMessage('hello, starting a conversation')],
        },
        createTestContext()
      );

      expect(result).toEqual({ invoke: true });
    });

    it('returns invoke: true when last message contains @agent', async () => {
      const result = await groupTriggerHook(
        {
          conversation: createConversationWithHistory(ConversationMode.group),
          newEvents: [createUserMessage('hey @agent what is this?')],
        },
        createTestContext()
      );

      expect(result).toEqual({ invoke: true });
    });

    it('returns invoke: false when last message does not contain @agent', async () => {
      const result = await groupTriggerHook(
        {
          conversation: createConversationWithHistory(ConversationMode.group),
          newEvents: [createUserMessage('just chatting with humans')],
        },
        createTestContext()
      );

      expect(result).toEqual({ invoke: false });
    });

    it('returns invoke: false when there are no user messages', async () => {
      const result = await groupTriggerHook(
        {
          conversation: createConversationWithHistory(ConversationMode.group),
          newEvents: [],
        },
        createTestContext()
      );

      expect(result).toEqual({ invoke: false });
    });

    it('checks the last user message when multiple events present', async () => {
      const result = await groupTriggerHook(
        {
          conversation: createConversationWithHistory(ConversationMode.group),
          newEvents: [
            createUserMessage('@agent do something'),
            createUserMessage('never mind, ignore that'),
          ],
        },
        createTestContext()
      );

      expect(result).toEqual({ invoke: false });
    });
  });

  describe('getTriggerHookForMode', () => {
    it('returns singleUserTriggerHook for user mode', () => {
      expect(getTriggerHookForMode(ConversationMode.user)).toBe(singleUserTriggerHook);
    });

    it('returns groupTriggerHook for group mode', () => {
      expect(getTriggerHookForMode(ConversationMode.group)).toBe(groupTriggerHook);
    });
  });
});
