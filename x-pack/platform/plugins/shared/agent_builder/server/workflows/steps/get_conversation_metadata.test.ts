/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConversationMetadataStepDefinition } from './get_conversation_metadata';
import {
  createStepHandlerContext,
  createWorkflowStepConversationClientMock,
} from '../../test_utils/workflow_steps';

const experimentalEnabled = jest.fn().mockResolvedValue(true);
const experimentalDisabled = jest.fn().mockResolvedValue(false);

describe('getConversationMetadataStepDefinition', () => {
  it('creates expected step definition structure', () => {
    const { getConversationClient } = createWorkflowStepConversationClientMock();
    const definition = getConversationMetadataStepDefinition(
      getConversationClient,
      experimentalEnabled
    );

    expect(definition.id).toBe('ai.conversation.metadata.read');
    expect(typeof definition.handler).toBe('function');
    expect(definition.inputSchema.safeParse({ conversation_id: 'abc-123' }).success).toBe(true);
  });

  it('returns metadata from the conversation', async () => {
    const { get, getConversationClient } = createWorkflowStepConversationClientMock({
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
        metadata: { status: 'open', severity: 'high' },
      },
    });
  });

  it('returns empty metadata when conversation has none', async () => {
    const { getConversationClient } = createWorkflowStepConversationClientMock({
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
        metadata: {},
      },
    });
  });

  it('returns an error when the conversation is not found', async () => {
    const { getConversationClient } = createWorkflowStepConversationClientMock({
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
    const { getConversationClient } = createWorkflowStepConversationClientMock();
    const definition = getConversationMetadataStepDefinition(
      getConversationClient,
      experimentalEnabled
    );

    expect(definition.inputSchema.safeParse({}).success).toBe(false);
  });

  it('returns an error when experimental features are disabled', async () => {
    const { getConversationClient } = createWorkflowStepConversationClientMock();
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
