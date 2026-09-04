/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateConversationMetadataStepDefinition } from './update_conversation_metadata';
import {
  createStepHandlerContext,
  createWorkflowStepConversationClientMock,
} from '../../test_utils/workflow_steps';

const experimentalEnabled = jest.fn().mockResolvedValue(true);
const experimentalDisabled = jest.fn().mockResolvedValue(false);

describe('updateConversationMetadataStepDefinition', () => {
  const baseInput = {
    conversation_id: 'conv-1',
    updates: { status: 'resolved', severity: 'low' },
  };

  it('creates expected step definition structure', () => {
    const { getConversationClient } = createWorkflowStepConversationClientMock();
    const definition = updateConversationMetadataStepDefinition(
      getConversationClient,
      experimentalEnabled
    );

    expect(definition.id).toBe('ai.conversation.metadata.patch');
    expect(typeof definition.handler).toBe('function');
    expect(definition.inputSchema.safeParse(baseInput).success).toBe(true);
  });

  it('calls patchMetadata and returns the changed fields and updated metadata', async () => {
    const { patchMetadata, getConversationClient } = createWorkflowStepConversationClientMock({
      patchMetadata: jest.fn().mockResolvedValue({
        conversation: {
          id: 'conv-1',
          metadata: { status: 'resolved', severity: 'low', priority: 'high' },
        },
        changedFields: ['status', 'severity'],
      }),
    });

    const definition = updateConversationMetadataStepDefinition(
      getConversationClient,
      experimentalEnabled
    );
    const result = await definition.handler(
      createStepHandlerContext({
        input: baseInput,
        stepType: 'agentBuilder.conversation.metadata.patch',
      })
    );

    expect(patchMetadata).toHaveBeenCalledWith('conv-1', { status: 'resolved', severity: 'low' });
    expect(result).toEqual({
      output: {
        conversation_id: 'conv-1',
        changed_fields: ['status', 'severity'],
        metadata: { status: 'resolved', severity: 'low', priority: 'high' },
      },
    });
  });

  it('returns empty changed_fields when the patch is a no-op', async () => {
    const { getConversationClient } = createWorkflowStepConversationClientMock({
      patchMetadata: jest.fn().mockResolvedValue({
        conversation: { id: 'conv-1', metadata: { status: 'open' } },
        changedFields: [],
      }),
    });

    const definition = updateConversationMetadataStepDefinition(
      getConversationClient,
      experimentalEnabled
    );
    const result = await definition.handler(
      createStepHandlerContext({
        input: { conversation_id: 'conv-1', updates: { status: 'open' } },
      })
    );

    expect(result).toEqual({
      output: {
        conversation_id: 'conv-1',
        changed_fields: [],
        metadata: { status: 'open' },
      },
    });
  });

  it('returns the error when patchMetadata throws', async () => {
    const { getConversationClient } = createWorkflowStepConversationClientMock({
      patchMetadata: jest.fn().mockRejectedValue(new Error('validation failed')),
    });

    const definition = updateConversationMetadataStepDefinition(
      getConversationClient,
      experimentalEnabled
    );
    const result = await definition.handler(createStepHandlerContext({ input: baseInput }));

    expect(result).toEqual({
      error: expect.objectContaining({ message: 'validation failed' }),
    });
  });

  it('rejects an empty updates object', () => {
    const { getConversationClient } = createWorkflowStepConversationClientMock();
    const definition = updateConversationMetadataStepDefinition(
      getConversationClient,
      experimentalEnabled
    );

    expect(
      definition.inputSchema.safeParse({ conversation_id: 'conv-1', updates: {} }).success
    ).toBe(false);
  });

  it('rejects input without conversation_id', () => {
    const { getConversationClient } = createWorkflowStepConversationClientMock();
    const definition = updateConversationMetadataStepDefinition(
      getConversationClient,
      experimentalEnabled
    );

    expect(definition.inputSchema.safeParse({ updates: { status: 'open' } }).success).toBe(false);
  });

  it('returns an error when experimental features are disabled', async () => {
    const { getConversationClient } = createWorkflowStepConversationClientMock();
    const definition = updateConversationMetadataStepDefinition(
      getConversationClient,
      experimentalDisabled
    );

    const result = await definition.handler(createStepHandlerContext({ input: baseInput }));

    expect(result).toEqual({
      error: expect.objectContaining({ message: expect.stringContaining('experimental features') }),
    });
  });
});
