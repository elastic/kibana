/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { createConversationNotFoundError } from '@kbn/agent-builder-common';
import type { MetadataFieldValue } from '@kbn/agent-builder-common';
import { appendWorkflowExecutionIdStepInputSchema } from '../../../common/workflow_execution/step_types';
import { getAppendWorkflowExecutionIdStepDefinition } from './append_workflow_execution_id_step';

type HandlerContext = Parameters<
  ReturnType<typeof getAppendWorkflowExecutionIdStepDefinition>['handler']
>[0];

const request = httpServerMock.createKibanaRequest();
const input = { conversationId: 'conv-1', workflowExecutionId: 'exec-2' };
const createContext = (stepInput = input): HandlerContext => ({
  input: stepInput,
  rawInput: stepInput,
  config: {},
  contextManager: {
    getContext: jest.fn(),
    getScopedEsClient: jest.fn(),
    getFakeRequest: jest.fn().mockReturnValue(request),
    renderInputTemplate: jest.fn((value) => value),
    callKibanaApi: jest.fn(),
  },
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  abortSignal: new AbortController().signal,
  stepId: 'append_workflow_execution',
  stepType: 'investigations.appendWorkflowExecutionId',
});

const setup = (
  metadata: Record<string, MetadataFieldValue> | undefined = { workflow_execution_ids: ['exec-1'] },
  templateId: string | undefined = 'investigation'
) => {
  const get = jest.fn().mockResolvedValue({ template_id: templateId, metadata });
  const patchMetadata = jest.fn().mockResolvedValue({ changedFields: ['workflow_execution_ids'] });
  const getConversationClient = jest.fn().mockResolvedValue({ get, patchMetadata });
  return {
    definition: getAppendWorkflowExecutionIdStepDefinition({ getConversationClient }),
    getConversationClient,
    get,
    patchMetadata,
  };
};

describe('investigations.appendWorkflowExecutionId', () => {
  it('appends a new ID in order without replacing other metadata', async () => {
    const { definition, getConversationClient, get, patchMetadata } = setup({
      workflow_execution_ids: ['exec-1', 'exec-3'],
      status: 'open',
    });

    expect(await definition.handler(createContext())).toEqual({
      output: { workflowExecutionId: 'exec-2' },
    });
    expect(getConversationClient).toHaveBeenCalledWith(request);
    expect(get).toHaveBeenCalledWith('conv-1');
    expect(patchMetadata).toHaveBeenCalledWith(
      'conv-1',
      { workflow_execution_ids: ['exec-1', 'exec-3', 'exec-2'] },
      { access: 'converse' }
    );
  });

  it('does not duplicate or reorder an existing ID on a retry', async () => {
    const { definition, patchMetadata } = setup({ workflow_execution_ids: ['exec-2', 'exec-3'] });

    expect(await definition.handler(createContext())).toEqual({
      output: { workflowExecutionId: 'exec-2' },
    });
    expect(patchMetadata).not.toHaveBeenCalled();
  });

  it.each<Record<string, MetadataFieldValue>>([{}, { workflow_execution_ids: [] }])(
    'initializes an absent or empty list: %p',
    async (metadata) => {
      const { definition, patchMetadata } = setup(metadata);

      await definition.handler(createContext());

      expect(patchMetadata).toHaveBeenCalledWith(
        'conv-1',
        { workflow_execution_ids: ['exec-2'] },
        { access: 'converse' }
      );
    }
  );

  it('initializes metadata when the conversation has none', async () => {
    const { definition, get, patchMetadata } = setup();
    get.mockResolvedValue({ template_id: 'investigation' });

    await definition.handler(createContext());

    expect(patchMetadata).toHaveBeenCalledWith(
      'conv-1',
      { workflow_execution_ids: ['exec-2'] },
      { access: 'converse' }
    );
  });

  it('rejects a non-investigation conversation even if the ID is already present', async () => {
    const { definition, patchMetadata } = setup(
      { workflow_execution_ids: ['exec-2'] },
      'escalation'
    );

    await expect(definition.handler(createContext())).rejects.toMatchObject({
      type: 'ValidationError',
    });
    expect(patchMetadata).not.toHaveBeenCalled();
  });

  it('rejects malformed stored metadata instead of discarding it', async () => {
    const { definition, patchMetadata } = setup({ workflow_execution_ids: 'exec-1' });

    await expect(definition.handler(createContext())).rejects.toMatchObject({
      type: 'ValidationError',
    });
    expect(patchMetadata).not.toHaveBeenCalled();
  });

  it.each([
    { ...input, conversationId: '' },
    { ...input, workflowExecutionId: '' },
    { ...input, conversationId: 'a'.repeat(257) },
    { ...input, workflowExecutionId: 'a'.repeat(257) },
  ])('validates input before reading or writing: %p', async (invalidInput) => {
    const { definition, getConversationClient } = setup();

    await expect(definition.handler(createContext(invalidInput))).rejects.toMatchObject({
      type: 'ValidationError',
    });
    expect(getConversationClient).not.toHaveBeenCalled();
  });

  it.each([{}, { conversationId: 'conv-1' }, { workflowExecutionId: 'exec-1' }])(
    'requires both IDs: %p',
    (invalidInput) => {
      expect(appendWorkflowExecutionIdStepInputSchema.safeParse(invalidInput).success).toBe(false);
    }
  );

  it('reports a missing conversation without writing metadata', async () => {
    const { definition, get, patchMetadata } = setup();
    get.mockRejectedValue(createConversationNotFoundError({ conversationId: 'conv-1' }));

    await expect(definition.handler(createContext())).rejects.toMatchObject({
      type: 'NotFoundError',
    });
    expect(patchMetadata).not.toHaveBeenCalled();
  });

  it('propagates a failed metadata write instead of reporting success', async () => {
    const { definition, patchMetadata } = setup();
    patchMetadata.mockRejectedValue(new Error('Forbidden'));

    await expect(definition.handler(createContext())).rejects.toMatchObject({
      type: 'ApiError',
      message: 'Forbidden',
    });
  });
});
