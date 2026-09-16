/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readAttachmentStepDefinition } from './attachment_read';
import {
  createStepHandlerContext,
  createWorkflowStepAttachmentClientMock,
} from '../../test_utils/workflow_steps';

const experimentalEnabled = jest.fn().mockResolvedValue(true);
const experimentalDisabled = jest.fn().mockResolvedValue(false);

const buildAttachment = () => ({
  id: 'att-1',
  type: 'text',
  current_version: 2,
  versions: [
    { version: 1, data: { text: 'old' } },
    { version: 2, data: { text: 'new' } },
  ],
  active: true,
});

describe('readAttachmentStepDefinition', () => {
  it('creates the expected step definition structure', () => {
    const { getAttachmentClient } = createWorkflowStepAttachmentClientMock();
    const definition = readAttachmentStepDefinition({
      getAttachmentClient,
      isExperimentalEnabled: experimentalEnabled,
    });

    expect(definition.id).toBe('ai.attachment.read');
    expect(typeof definition.handler).toBe('function');
  });

  it('reads the current version when version is omitted', async () => {
    const { get, getAttachmentClient } = createWorkflowStepAttachmentClientMock({
      get: jest.fn().mockResolvedValue(buildAttachment()),
    });

    const definition = readAttachmentStepDefinition({
      getAttachmentClient,
      isExperimentalEnabled: experimentalEnabled,
    });

    const result = await definition.handler(
      createStepHandlerContext({
        input: { conversation_id: 'conv-1', attachment_id: 'att-1' },
      })
    );

    expect(get).toHaveBeenCalledWith({ conversationId: 'conv-1', attachmentId: 'att-1' });
    expect(result).toEqual({ output: { data: { text: 'new' }, version: 2 } });
  });

  it('reads a specific version when version is provided', async () => {
    const { getAttachmentClient } = createWorkflowStepAttachmentClientMock({
      get: jest.fn().mockResolvedValue(buildAttachment()),
    });

    const definition = readAttachmentStepDefinition({
      getAttachmentClient,
      isExperimentalEnabled: experimentalEnabled,
    });

    const result = await definition.handler(
      createStepHandlerContext({
        input: { conversation_id: 'conv-1', attachment_id: 'att-1', version: 1 },
      })
    );

    expect(result).toEqual({ output: { data: { text: 'old' }, version: 1 } });
  });

  it('returns an error when the requested version does not exist', async () => {
    const { getAttachmentClient } = createWorkflowStepAttachmentClientMock({
      get: jest.fn().mockResolvedValue(buildAttachment()),
    });

    const definition = readAttachmentStepDefinition({
      getAttachmentClient,
      isExperimentalEnabled: experimentalEnabled,
    });

    const result = await definition.handler(
      createStepHandlerContext({
        input: { conversation_id: 'conv-1', attachment_id: 'att-1', version: 99 },
      })
    );

    expect(result).toEqual({
      error: expect.objectContaining({
        message: expect.stringContaining('version 99'),
      }),
    });
  });

  it('returns an error when experimental is disabled', async () => {
    const { getAttachmentClient } = createWorkflowStepAttachmentClientMock();
    const definition = readAttachmentStepDefinition({
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
      get: jest.fn().mockRejectedValue(new Error('not found')),
    });

    const definition = readAttachmentStepDefinition({
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
