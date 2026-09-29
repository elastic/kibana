/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteAttachmentStepDefinition } from './attachment_delete';
import {
  createStepHandlerContext,
  createWorkflowStepAttachmentClientMock,
} from '../../test_utils/workflow_steps';

const experimentalEnabled = jest.fn().mockResolvedValue(true);
const experimentalDisabled = jest.fn().mockResolvedValue(false);

describe('deleteAttachmentStepDefinition', () => {
  it('creates the expected step definition structure', () => {
    const { getAttachmentClient } = createWorkflowStepAttachmentClientMock();
    const definition = deleteAttachmentStepDefinition({
      getAttachmentClient,
      isExperimentalEnabled: experimentalEnabled,
    });

    expect(definition.id).toBe('ai.attachment.delete');
    expect(typeof definition.handler).toBe('function');
  });

  it('soft-deletes by default', async () => {
    const { delete: del, getAttachmentClient } = createWorkflowStepAttachmentClientMock({
      delete: jest.fn().mockResolvedValue(undefined),
    });

    const definition = deleteAttachmentStepDefinition({
      getAttachmentClient,
      isExperimentalEnabled: experimentalEnabled,
    });

    const result = await definition.handler(
      createStepHandlerContext({
        input: { conversation_id: 'conv-1', attachment_id: 'att-1' },
      })
    );

    expect(del).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      attachmentId: 'att-1',
      permanent: undefined,
    });
    expect(result).toEqual({ output: { success: true, permanent: false } });
  });

  it('permanently deletes when permanent=true', async () => {
    const { delete: del, getAttachmentClient } = createWorkflowStepAttachmentClientMock({
      delete: jest.fn().mockResolvedValue(undefined),
    });

    const definition = deleteAttachmentStepDefinition({
      getAttachmentClient,
      isExperimentalEnabled: experimentalEnabled,
    });

    const result = await definition.handler(
      createStepHandlerContext({
        input: { conversation_id: 'conv-1', attachment_id: 'att-1', permanent: true },
      })
    );

    expect(del).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      attachmentId: 'att-1',
      permanent: true,
    });
    expect(result).toEqual({ output: { success: true, permanent: true } });
  });

  it('returns an error when experimental is disabled', async () => {
    const { getAttachmentClient } = createWorkflowStepAttachmentClientMock();
    const definition = deleteAttachmentStepDefinition({
      getAttachmentClient,
      isExperimentalEnabled: experimentalDisabled,
    });

    const result = await definition.handler(
      createStepHandlerContext({
        input: { conversation_id: 'conv-1', attachment_id: 'att-1' },
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
      delete: jest.fn().mockRejectedValue(new Error('not found')),
    });

    const definition = deleteAttachmentStepDefinition({
      getAttachmentClient,
      isExperimentalEnabled: experimentalEnabled,
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
