/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createBadRequestError,
  createConversationNotFoundError,
  EventActorType,
} from '@kbn/agent-builder-common';
import { addConversationEventStepDefinition } from './add_conversation_event';
import {
  createStepHandlerContext,
  createWorkflowStepAgentRegistryMock,
  createWorkflowStepConversationClientMock,
} from '../../test_utils/workflow_steps';

describe('addConversationEventStepDefinition', () => {
  const conversationId = 'conv-1';

  const baseInput = {
    conversation_id: conversationId,
    type: 'text_note',
    data: { text: 'Escalated by workflow' },
  };

  const appendedEvent = {
    id: 'event-1',
    type: 'text_note',
    data: { text: 'Escalated by workflow' },
    created_at: '2026-01-01T00:00:00.000Z',
    actor: { type: EventActorType.user, id: 'user-1' },
  };

  const buildDefinition = (
    convOverrides: Parameters<typeof createWorkflowStepConversationClientMock>[0] = {},
    { experimental = true }: { experimental?: boolean } = {}
  ) => {
    const conv = createWorkflowStepConversationClientMock(convOverrides);
    const agents = createWorkflowStepAgentRegistryMock();
    const isExperimentalEnabled = jest.fn().mockResolvedValue(experimental);
    const definition = addConversationEventStepDefinition({
      getConversationClient: conv.getConversationClient,
      getAgentRegistry: agents.getAgentRegistry,
      isExperimentalEnabled,
    });
    return { conv, isExperimentalEnabled, definition };
  };

  it('creates expected step definition structure', () => {
    const { definition } = buildDefinition();

    expect(definition.id).toBe('ai.conversation.add_event');
    expect(typeof definition.handler).toBe('function');
    expect(definition.inputSchema.safeParse(baseInput).success).toBe(true);
  });

  it('appends the event and returns the server-assigned fields', async () => {
    const { conv, definition } = buildDefinition({
      addCustomEvents: jest.fn().mockResolvedValue([appendedEvent]),
    });

    const result = await definition.handler(createStepHandlerContext({ input: baseInput }));

    expect(conv.addCustomEvents).toHaveBeenCalledWith({
      id: conversationId,
      events: [{ type: 'text_note', data: { text: 'Escalated by workflow' } }],
    });
    expect(result).toEqual({
      output: {
        conversation_id: conversationId,
        event_id: 'event-1',
        type: 'text_note',
        created_at: '2026-01-01T00:00:00.000Z',
      },
    });
  });

  it('sends an empty payload when data is omitted', async () => {
    const { conv, definition } = buildDefinition({
      addCustomEvents: jest.fn().mockResolvedValue([{ ...appendedEvent, data: {} }]),
    });

    await definition.handler(
      createStepHandlerContext({ input: { conversation_id: conversationId, type: 'text_note' } })
    );

    expect(conv.addCustomEvents).toHaveBeenCalledWith({
      id: conversationId,
      events: [{ type: 'text_note', data: {} }],
    });
  });

  it('returns an error without writing when experimental features are disabled', async () => {
    const { conv, definition } = buildDefinition({}, { experimental: false });

    const result = await definition.handler(createStepHandlerContext({ input: baseInput }));

    expect(result).toEqual({
      error: expect.objectContaining({
        message: expect.stringMatching(/experimental features/i),
      }),
    });
    expect(conv.addCustomEvents).not.toHaveBeenCalled();
  });

  it('propagates validation errors for unknown event types', async () => {
    const { definition } = buildDefinition({
      addCustomEvents: jest
        .fn()
        .mockRejectedValue(createBadRequestError('Unknown conversation event type "nope"')),
    });

    const result = await definition.handler(
      createStepHandlerContext({ input: { ...baseInput, type: 'nope' } })
    );

    expect(result).toEqual({
      error: expect.objectContaining({ message: expect.stringContaining('nope') }),
    });
  });

  it('propagates a not-found error for a missing conversation', async () => {
    const { definition } = buildDefinition({
      addCustomEvents: jest
        .fn()
        .mockRejectedValue(createConversationNotFoundError({ conversationId: 'missing' })),
    });

    const result = await definition.handler(
      createStepHandlerContext({ input: { ...baseInput, conversation_id: 'missing' } })
    );

    expect(result).toEqual({
      error: expect.objectContaining({ message: expect.stringContaining('missing') }),
    });
  });

  describe('input schema', () => {
    const schema = buildDefinition().definition.inputSchema;

    it('requires conversation_id', () => {
      expect(schema.safeParse({ type: 'text_note' }).success).toBe(false);
    });

    it('requires a non-empty type', () => {
      expect(schema.safeParse({ conversation_id: conversationId, type: '' }).success).toBe(false);
    });

    it('defaults data to an empty object when omitted', () => {
      const parsed = schema.safeParse({ conversation_id: conversationId, type: 'text_note' });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.data).toEqual({});
      }
    });

    it('accepts nested and array values inside data', () => {
      expect(
        schema.safeParse({
          conversation_id: conversationId,
          type: 'text_note',
          data: { text: 'hi', tags: ['a', 'b'], nested: { count: 3 } },
        }).success
      ).toBe(true);
    });
  });
});
