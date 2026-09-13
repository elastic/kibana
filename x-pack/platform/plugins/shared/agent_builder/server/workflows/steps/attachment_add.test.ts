/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addAttachmentStepDefinition } from './attachment_add';
import {
  createStepHandlerContext,
  createWorkflowStepAttachmentClientMock,
} from '../../test_utils/workflow_steps';

const experimentalEnabled = jest.fn().mockResolvedValue(true);
const experimentalDisabled = jest.fn().mockResolvedValue(false);

describe('addAttachmentStepDefinition', () => {
  it('creates the expected step definition structure', () => {
    const { getAttachmentClient } = createWorkflowStepAttachmentClientMock();
    const definition = addAttachmentStepDefinition({
      getAttachmentClient,
      isExperimentalEnabled: experimentalEnabled,
    });

    expect(definition.id).toBe('ai.attachment.add');
    expect(typeof definition.handler).toBe('function');
    expect(
      definition.inputSchema.safeParse({
        conversation_id: 'conv-1',
        type: 'text',
        data: { text: 'hi' },
      }).success
    ).toBe(true);
  });

  it('adds an attachment and returns the reference', async () => {
    const { create, getAttachmentClient } = createWorkflowStepAttachmentClientMock({
      create: jest.fn().mockResolvedValue({
        id: 'att-1',
        type: 'text',
        current_version: 1,
        versions: [],
      }),
    });

    const definition = addAttachmentStepDefinition({
      getAttachmentClient,
      isExperimentalEnabled: experimentalEnabled,
    });

    const result = await definition.handler(
      createStepHandlerContext({
        input: {
          conversation_id: 'conv-1',
          type: 'text',
          data: { text: 'hi' },
        },
      })
    );

    expect(create).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      id: undefined,
      type: 'text',
      data: { text: 'hi' },
      origin: undefined,
      description: undefined,
      hidden: undefined,
    });
    expect(result).toEqual({
      output: { attachment_id: 'att-1', type: 'text', current_version: 1 },
    });
  });

  it('returns an error when experimental features are disabled', async () => {
    const { getAttachmentClient } = createWorkflowStepAttachmentClientMock();
    const definition = addAttachmentStepDefinition({
      getAttachmentClient,
      isExperimentalEnabled: experimentalDisabled,
    });

    const result = await definition.handler(
      createStepHandlerContext({
        input: { conversation_id: 'conv-1', type: 'text', data: { text: 'x' } },
      })
    );

    expect(result).toEqual({
      error: expect.objectContaining({
        message: expect.stringContaining('experimental features'),
      }),
    });
  });

  it('returns an error when the client throws', async () => {
    const { getAttachmentClient } = createWorkflowStepAttachmentClientMock({
      create: jest.fn().mockRejectedValue(new Error('boom')),
    });

    const definition = addAttachmentStepDefinition({
      getAttachmentClient,
      isExperimentalEnabled: experimentalEnabled,
    });

    const result = await definition.handler(
      createStepHandlerContext({
        input: { conversation_id: 'conv-1', type: 'text', data: { text: 'x' } },
      })
    );

    expect(result).toEqual({
      error: expect.objectContaining({ message: 'boom' }),
    });
  });

  it('rejects input without conversation_id', () => {
    const { getAttachmentClient } = createWorkflowStepAttachmentClientMock();
    const definition = addAttachmentStepDefinition({
      getAttachmentClient,
      isExperimentalEnabled: experimentalEnabled,
    });

    expect(definition.inputSchema.safeParse({ type: 'text', data: {} }).success).toBe(false);
  });
});
