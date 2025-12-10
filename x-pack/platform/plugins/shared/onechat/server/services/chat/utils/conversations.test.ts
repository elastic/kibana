/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, firstValueFrom, toArray } from 'rxjs';
import type { RoundCompleteEvent, ConversationRound } from '@kbn/onechat-common';
import { ChatEventType, isConversationCreatedEvent, isConversationUpdatedEvent } from '@kbn/onechat-common';
import type { ConversationClient } from '../../conversation';
import { createConversation$, updateConversation$ } from './conversations';

const createMockConversationClient = (): jest.Mocked<ConversationClient> => ({
  get: jest.fn(),
  exists: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  list: jest.fn(),
  delete: jest.fn(),
});

const createMockRound = (): ConversationRound => ({
  id: 'round-1',
  trace_id: 'trace-1',
  input: { message: 'test message' },
  steps: [],
  started_at: new Date().toISOString(),
  time_to_first_token: 100,
  time_to_last_token: 500,
  model_usage: {
    connector_id: 'test-connector',
    llm_calls: 1,
    input_tokens: 10,
    output_tokens: 20,
  },
  response: {
    message: 'test response',
  },
});

const createMockRoundCompleteEvent = (
  round: ConversationRound,
  updatedAttachments?: unknown[]
): RoundCompleteEvent => ({
  type: ChatEventType.roundComplete,
  data: {
    round,
    updatedAttachments,
  },
});

describe('conversations utils', () => {
  describe('createConversation$', () => {
    it('should create a conversation with the round from the event', async () => {
      const client = createMockConversationClient();
      const round = createMockRound();
      const title$ = of('Test Conversation');
      const roundCompletedEvents$ = of(createMockRoundCompleteEvent(round));

      client.create.mockResolvedValue({
        id: 'conv-1',
        agent_id: 'test-agent',
        title: 'Test Conversation',
        rounds: [round],
        user: { id: 'user-1', username: 'testuser' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const events$ = createConversation$({
        agentId: 'test-agent',
        conversationClient: client,
        conversationId: 'conv-1',
        title$,
        roundCompletedEvents$,
      });

      const events = await firstValueFrom(events$.pipe(toArray()));

      expect(client.create).toHaveBeenCalledWith({
        id: 'conv-1',
        title: 'Test Conversation',
        agent_id: 'test-agent',
        rounds: [round],
        attachments: undefined,
      });
      expect(events.length).toBe(1);
      expect(isConversationCreatedEvent(events[0])).toBe(true);
    });

    it('should include attachments when creating a conversation', async () => {
      const client = createMockConversationClient();
      const round = createMockRound();
      const title$ = of('Test Conversation');
      const mockAttachments = [
        {
          id: 'att-1',
          type: 'visualization',
          data: { some: 'data' },
          version: 1,
          status: 'active',
        },
      ];
      const roundCompletedEvents$ = of(createMockRoundCompleteEvent(round, mockAttachments));

      client.create.mockResolvedValue({
        id: 'conv-1',
        agent_id: 'test-agent',
        title: 'Test Conversation',
        rounds: [round],
        attachments: mockAttachments,
        user: { id: 'user-1', username: 'testuser' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const events$ = createConversation$({
        agentId: 'test-agent',
        conversationClient: client,
        conversationId: 'conv-1',
        title$,
        roundCompletedEvents$,
      });

      const events = await firstValueFrom(events$.pipe(toArray()));

      expect(client.create).toHaveBeenCalledWith({
        id: 'conv-1',
        title: 'Test Conversation',
        agent_id: 'test-agent',
        rounds: [round],
        attachments: mockAttachments,
      });
      expect(events.length).toBe(1);
      expect(isConversationCreatedEvent(events[0])).toBe(true);
    });
  });

  describe('updateConversation$', () => {
    it('should update a conversation by appending the new round', async () => {
      const client = createMockConversationClient();
      const existingRound = createMockRound();
      const newRound = { ...createMockRound(), id: 'round-2' };
      const title$ = of('Test Conversation');
      const roundCompletedEvents$ = of(createMockRoundCompleteEvent(newRound));

      const existingConversation = {
        id: 'conv-1',
        agent_id: 'test-agent',
        title: 'Test Conversation',
        rounds: [existingRound],
        user: { id: 'user-1', username: 'testuser' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      client.update.mockResolvedValue({
        ...existingConversation,
        rounds: [existingRound, newRound],
      });

      const events$ = updateConversation$({
        conversationClient: client,
        conversation: existingConversation,
        title$,
        roundCompletedEvents$,
      });

      const events = await firstValueFrom(events$.pipe(toArray()));

      expect(client.update).toHaveBeenCalledWith({
        id: 'conv-1',
        title: 'Test Conversation',
        rounds: [existingRound, newRound],
        attachments: undefined,
      });
      expect(events.length).toBe(1);
      expect(isConversationUpdatedEvent(events[0])).toBe(true);
    });

    it('should include updated attachments when updating a conversation', async () => {
      const client = createMockConversationClient();
      const existingRound = createMockRound();
      const newRound = { ...createMockRound(), id: 'round-2' };
      const title$ = of('Test Conversation');
      const mockAttachments = [
        {
          id: 'att-1',
          type: 'visualization',
          data: { some: 'data' },
          version: 1,
          status: 'active',
        },
        {
          id: 'att-2',
          type: 'table',
          data: { other: 'data' },
          version: 1,
          status: 'active',
        },
      ];
      const roundCompletedEvents$ = of(createMockRoundCompleteEvent(newRound, mockAttachments));

      const existingConversation = {
        id: 'conv-1',
        agent_id: 'test-agent',
        title: 'Test Conversation',
        rounds: [existingRound],
        attachments: [
          {
            id: 'att-1',
            type: 'visualization',
            data: { old: 'data' },
            version: 0,
            status: 'active',
          },
        ],
        user: { id: 'user-1', username: 'testuser' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      client.update.mockResolvedValue({
        ...existingConversation,
        rounds: [existingRound, newRound],
        attachments: mockAttachments,
      });

      const events$ = updateConversation$({
        conversationClient: client,
        conversation: existingConversation,
        title$,
        roundCompletedEvents$,
      });

      const events = await firstValueFrom(events$.pipe(toArray()));

      // Should pass the updated attachments from the event, overwriting existing
      expect(client.update).toHaveBeenCalledWith({
        id: 'conv-1',
        title: 'Test Conversation',
        rounds: [existingRound, newRound],
        attachments: mockAttachments,
      });
      expect(events.length).toBe(1);
      expect(isConversationUpdatedEvent(events[0])).toBe(true);
    });

    it('should handle conversation updates with deleted attachments', async () => {
      const client = createMockConversationClient();
      const existingRound = createMockRound();
      const newRound = { ...createMockRound(), id: 'round-2' };
      const title$ = of('Test Conversation');
      const mockAttachments = [
        {
          id: 'att-1',
          type: 'visualization',
          data: { some: 'data' },
          version: 1,
          status: 'deleted', // This attachment was deleted during the round
        },
      ];
      const roundCompletedEvents$ = of(createMockRoundCompleteEvent(newRound, mockAttachments));

      const existingConversation = {
        id: 'conv-1',
        agent_id: 'test-agent',
        title: 'Test Conversation',
        rounds: [existingRound],
        attachments: [
          {
            id: 'att-1',
            type: 'visualization',
            data: { some: 'data' },
            version: 1,
            status: 'active',
          },
        ],
        user: { id: 'user-1', username: 'testuser' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      client.update.mockResolvedValue({
        ...existingConversation,
        rounds: [existingRound, newRound],
        attachments: mockAttachments,
      });

      const events$ = updateConversation$({
        conversationClient: client,
        conversation: existingConversation,
        title$,
        roundCompletedEvents$,
      });

      const events = await firstValueFrom(events$.pipe(toArray()));

      expect(client.update).toHaveBeenCalledWith({
        id: 'conv-1',
        title: 'Test Conversation',
        rounds: [existingRound, newRound],
        attachments: mockAttachments,
      });
      expect(events.length).toBe(1);
    });
  });
});
