/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateAttachmentStepDefinition } from './attachment_update';
import {
  createStepHandlerContext,
  createWorkflowStepAttachmentClientMock,
} from '../../test_utils/workflow_steps';

describe('updateAttachmentStepDefinition', () => {
  it('creates the expected step definition structure', () => {
    const { getAttachmentClient } = createWorkflowStepAttachmentClientMock();
    const definition = updateAttachmentStepDefinition({
      getAttachmentClient,
    });

    expect(definition.id).toBe('ai.attachment.update');
    expect(typeof definition.handler).toBe('function');
  });

  it('updates and returns the reference', async () => {
    const { update, getAttachmentClient } = createWorkflowStepAttachmentClientMock({
      update: jest.fn().mockResolvedValue({
        id: 'att-1',
        type: 'text',
        current_version: 3,
        versions: [],
      }),
    });

    const definition = updateAttachmentStepDefinition({
      getAttachmentClient,
    });

    const result = await definition.handler(
      createStepHandlerContext({
        input: {
          conversation_id: 'conv-1',
          attachment_id: 'att-1',
          data: { text: 'new' },
        },
      })
    );

    expect(update).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      attachmentId: 'att-1',
      data: { text: 'new' },
      description: undefined,
      render_inline: undefined,
    });
    expect(result).toEqual({
      output: { attachment_id: 'att-1', current_version: 3 },
    });
  });

  it('forwards render_inline to the client', async () => {
    const { update, getAttachmentClient } = createWorkflowStepAttachmentClientMock({
      update: jest
        .fn()
        .mockResolvedValue({ id: 'att-1', type: 'text', current_version: 2, versions: [] }),
    });
    const definition = updateAttachmentStepDefinition({
      getAttachmentClient,
    });

    expect(
      definition.inputSchema.safeParse({
        conversation_id: 'conv-1',
        attachment_id: 'att-1',
        data: {},
        render_inline: true,
      }).success
    ).toBe(true);

    await definition.handler(
      createStepHandlerContext({
        input: { conversation_id: 'conv-1', attachment_id: 'att-1', data: {}, render_inline: true },
      })
    );

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ render_inline: true }));
  });

  it('returns an error when the client throws', async () => {
    const { getAttachmentClient } = createWorkflowStepAttachmentClientMock({
      update: jest.fn().mockRejectedValue(new Error('not found')),
    });

    const definition = updateAttachmentStepDefinition({
      getAttachmentClient,
    });

    const result = await definition.handler(
      createStepHandlerContext({
        input: { conversation_id: 'conv-1', attachment_id: 'missing' },
      })
    );

    expect(result).toEqual({
      error: expect.objectContaining({ message: 'not found' }),
    });
  });
});
