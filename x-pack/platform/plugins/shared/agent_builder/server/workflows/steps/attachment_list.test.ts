/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { listAttachmentsStepDefinition } from './attachment_list';
import {
  createStepHandlerContext,
  createWorkflowStepAttachmentClientMock,
} from '../../test_utils/workflow_steps';

const experimentalEnabled = jest.fn().mockResolvedValue(true);
const experimentalDisabled = jest.fn().mockResolvedValue(false);

describe('listAttachmentsStepDefinition', () => {
  it('creates the expected step definition structure', () => {
    const { getAttachmentClient } = createWorkflowStepAttachmentClientMock();
    const definition = listAttachmentsStepDefinition({
      getAttachmentClient,
      isExperimentalEnabled: experimentalEnabled,
    });

    expect(definition.id).toBe('ai.attachment.list');
    expect(typeof definition.handler).toBe('function');
  });

  it('returns a summary of active attachments by default', async () => {
    const { list, getAttachmentClient } = createWorkflowStepAttachmentClientMock({
      list: jest.fn().mockResolvedValue({
        results: [
          {
            id: 'att-1',
            type: 'text',
            current_version: 2,
            description: 'Runbook',
            active: true,
            versions: [
              { version: 1, data: { text: 'x' } },
              { version: 2, data: { text: 'y' } },
            ],
          },
        ],
        total_token_estimate: 7,
      }),
    });

    const definition = listAttachmentsStepDefinition({
      getAttachmentClient,
      isExperimentalEnabled: experimentalEnabled,
    });

    const result = await definition.handler(
      createStepHandlerContext({ input: { conversation_id: 'conv-1' } })
    );

    expect(list).toHaveBeenCalledWith({ conversationId: 'conv-1', includeDeleted: undefined });
    expect(result).toEqual({
      output: {
        attachments: [
          {
            id: 'att-1',
            type: 'text',
            current_version: 2,
            description: 'Runbook',
            active: true,
          },
        ],
        total_token_estimate: 7,
      },
    });
  });

  it('forwards include_deleted to the client', async () => {
    const { list, getAttachmentClient } = createWorkflowStepAttachmentClientMock({
      list: jest.fn().mockResolvedValue({ results: [], total_token_estimate: 0 }),
    });

    const definition = listAttachmentsStepDefinition({
      getAttachmentClient,
      isExperimentalEnabled: experimentalEnabled,
    });

    await definition.handler(
      createStepHandlerContext({
        input: { conversation_id: 'conv-1', include_deleted: true },
      })
    );

    expect(list).toHaveBeenCalledWith({ conversationId: 'conv-1', includeDeleted: true });
  });

  it('returns an error when experimental is disabled', async () => {
    const { getAttachmentClient } = createWorkflowStepAttachmentClientMock();
    const definition = listAttachmentsStepDefinition({
      getAttachmentClient,
      isExperimentalEnabled: experimentalDisabled,
    });

    const result = await definition.handler(
      createStepHandlerContext({ input: { conversation_id: 'conv-1' } })
    );

    expect(result).toEqual({
      error: expect.objectContaining({
        message: expect.stringContaining('experimental features'),
      }),
    });
  });

  it('returns an error when the client throws', async () => {
    const { getAttachmentClient } = createWorkflowStepAttachmentClientMock({
      list: jest.fn().mockRejectedValue(new Error('boom')),
    });

    const definition = listAttachmentsStepDefinition({
      getAttachmentClient,
      isExperimentalEnabled: experimentalEnabled,
    });

    const result = await definition.handler(
      createStepHandlerContext({ input: { conversation_id: 'conv-1' } })
    );

    expect(result).toEqual({
      error: expect.objectContaining({ message: 'boom' }),
    });
  });
});
