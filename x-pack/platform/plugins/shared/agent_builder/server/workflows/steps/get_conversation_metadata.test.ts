/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConversationMetadataStepDefinition } from './get_conversation_metadata';
import { createStepHandlerContext, createConversationClientMock } from './test_utils';

const experimentalEnabled = jest.fn().mockResolvedValue(true);
const experimentalDisabled = jest.fn().mockResolvedValue(false);

describe('getConversationMetadataStepDefinition', () => {
  it('creates expected step definition structure', () => {
    const { getConversationClient } = createConversationClientMock();
    const definition = getConversationMetadataStepDefinition(
      getConversationClient,
      experimentalEnabled
    );

    expect(definition.id).toBe('agentBuilder.conversation.metadata.read');
    expect(typeof definition.handler).toBe('function');
    expect(definition.inputSchema.safeParse({ conversation_id: 'abc-123' }).success).toBe(true);
  });

  it('returns metadata from the conversation', async () => {
    const { get, getConversationClient } = createConversationClientMock({
      get: jest.fn().mockResolvedValue({
        id: 'conv-1',
        template_id: 'investigation',
        metadata: { status: 'open', severity: 'high' },
      }),
    });

    const definition = getConversationMetadataStepDefinition(
      getConversationClient,
      experimentalEnabled
    );
    const context = createStepHandlerContext({
      input: { conversation_id: 'conv-1' },
      stepType: 'agentBuilder.conversation.metadata.read',
    });

    const result = await definition.handler(context);

    expect(get).toHaveBeenCalledWith('conv-1');
    expect(result).toEqual({
      output: {
        conversation_id: 'conv-1',
        template_id: 'investigation',
        parent_id: undefined,
        parent_relation: undefined,
        metadata: { status: 'open', severity: 'high' },
      },
    });
  });

  it('returns parent relationship context when the conversation has a parent', async () => {
    const { getConversationClient } = createConversationClientMock({
      get: jest.fn().mockResolvedValue({
        id: 'child-conv',
        template_id: 'proposal',
        parent_conversation: { id: 'parent-conv', relation: 'subagent' },
        metadata: { decision: 'pending' },
      }),
    });

    const definition = getConversationMetadataStepDefinition(
      getConversationClient,
      experimentalEnabled
    );
    const result = await definition.handler(
      createStepHandlerContext({ input: { conversation_id: 'child-conv' } })
    );

    expect(result).toEqual({
      output: {
        conversation_id: 'child-conv',
        template_id: 'proposal',
        parent_id: 'parent-conv',
        parent_relation: 'subagent',
        metadata: { decision: 'pending' },
      },
    });
  });

  it('returns empty metadata when conversation has none', async () => {
    const { getConversationClient } = createConversationClientMock({
      get: jest.fn().mockResolvedValue({
        id: 'conv-1',
        template_id: undefined,
        metadata: undefined,
      }),
    });

    const definition = getConversationMetadataStepDefinition(
      getConversationClient,
      experimentalEnabled
    );
    const result = await definition.handler(
      createStepHandlerContext({ input: { conversation_id: 'conv-1' } })
    );

    expect(result).toEqual({
      output: {
        conversation_id: 'conv-1',
        template_id: undefined,
        parent_id: undefined,
        parent_relation: undefined,
        metadata: {},
      },
    });
  });

  it('returns an error when the conversation is not found', async () => {
    const { getConversationClient } = createConversationClientMock({
      get: jest.fn().mockRejectedValue(new Error('not found')),
    });

    const definition = getConversationMetadataStepDefinition(
      getConversationClient,
      experimentalEnabled
    );
    const result = await definition.handler(
      createStepHandlerContext({ input: { conversation_id: 'missing' } })
    );

    expect(result).toEqual({
      error: expect.objectContaining({ message: 'not found' }),
    });
  });

  it('rejects input without conversation_id', () => {
    const { getConversationClient } = createConversationClientMock();
    const definition = getConversationMetadataStepDefinition(
      getConversationClient,
      experimentalEnabled
    );

    expect(definition.inputSchema.safeParse({}).success).toBe(false);
  });

  it('returns an error when experimental features are disabled', async () => {
    const { getConversationClient } = createConversationClientMock();
    const definition = getConversationMetadataStepDefinition(
      getConversationClient,
      experimentalDisabled
    );

    const result = await definition.handler(
      createStepHandlerContext({ input: { conversation_id: 'conv-1' } })
    );

    expect(result).toEqual({
      error: expect.objectContaining({ message: expect.stringContaining('experimental features') }),
    });
  });
});
