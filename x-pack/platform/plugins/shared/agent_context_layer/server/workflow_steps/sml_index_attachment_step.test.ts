/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { AgentContextLayerPluginStart } from '../types';
import { createSmlIndexAttachmentStepDefinition } from './sml_index_attachment_step';

const buildStartContract = (): jest.Mocked<AgentContextLayerPluginStart> => ({
  search: jest.fn(),
  checkItemsAccess: jest.fn(),
  getDocuments: jest.fn(),
  // Default: treat any type as registered. Individual tests can override.
  getTypeDefinition: jest.fn().mockImplementation((id: string) => ({ id } as any)),
  resolveSmlAttachItems: jest.fn(),
  indexAttachment: jest.fn().mockResolvedValue(undefined),
});

type StepInput =
  | {
      originId: string;
      attachmentType: string;
      action: 'create' | 'update';
      chunks: Array<{
        type: string;
        title: string;
        content: string;
        description?: string;
        user_id?: string;
        references?: string[];
      }>;
    }
  | { originId: string; attachmentType: string; action: 'delete' };

const buildHandlerContext = (input: StepInput, request = httpServerMock.createKibanaRequest()) => ({
  input,
  config: {},
  rawInput: input,
  contextManager: {
    getContext: jest.fn(),
    getScopedEsClient: jest.fn(),
    renderInputTemplate: jest.fn((value: unknown) => value),
    getFakeRequest: jest.fn().mockReturnValue(request),
  },
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  abortSignal: new AbortController().signal,
  stepId: 'test-step',
  stepType: 'agentContextLayer.smlIndexAttachment',
});

describe('createSmlIndexAttachmentStepDefinition', () => {
  it('exposes the expected step type id and schemas', () => {
    const definition = createSmlIndexAttachmentStepDefinition({
      getStartContract: () => buildStartContract(),
      getSpaces: () => undefined,
    });
    expect(definition.id).toBe('agentContextLayer.smlIndexAttachment');
    expect(definition.inputSchema).toBeDefined();
    expect(definition.outputSchema).toBeDefined();
    expect(typeof definition.handler).toBe('function');
  });

  it('forwards caller-supplied chunks to the start contract for create', async () => {
    const startContract = buildStartContract();
    const spacesService = { getSpaceId: jest.fn().mockReturnValue('test-space') };
    const definition = createSmlIndexAttachmentStepDefinition({
      getStartContract: () => startContract,
      getSpaces: () => ({ spacesService } as any),
    });

    const request = httpServerMock.createKibanaRequest();
    const context = buildHandlerContext(
      {
        originId: 'doc-42',
        attachmentType: 'custom',
        action: 'create',
        chunks: [
          {
            type: 'custom',
            title: 'My title',
            content: 'My content',
            description: 'desc',
          },
        ],
      },
      request
    );

    const result = await definition.handler(context as any);

    expect(startContract.indexAttachment).toHaveBeenCalledWith({
      request,
      originId: 'doc-42',
      attachmentType: 'custom',
      action: 'create',
      chunks: [
        {
          type: 'custom',
          title: 'My title',
          content: 'My content',
          description: 'desc',
        },
      ],
      // Workflow step is always a "direct" write — overrides any crawler chunks.
      source: 'direct',
    });
    expect(result).toEqual({
      output: {
        originId: 'doc-42',
        attachmentType: 'custom',
        action: 'create',
        spaceId: 'test-space',
        chunkCount: 1,
        acknowledged: true,
      },
    });
  });

  it('strips optional chunk fields when not provided', async () => {
    const startContract = buildStartContract();
    const definition = createSmlIndexAttachmentStepDefinition({
      getStartContract: () => startContract,
      getSpaces: () => undefined,
    });

    const context = buildHandlerContext({
      originId: 'doc-1',
      attachmentType: 'custom',
      action: 'update',
      chunks: [{ type: 'custom', title: 't', content: 'c' }],
    });

    await definition.handler(context as any);
    const callArgs = startContract.indexAttachment.mock.calls[0][0];
    expect(callArgs.chunks).toEqual([{ type: 'custom', title: 't', content: 'c' }]);
    expect(Object.keys(callArgs.chunks![0])).toEqual(['type', 'title', 'content']);
  });

  it('supports delete without chunks and reports chunkCount = 0', async () => {
    const startContract = buildStartContract();
    const definition = createSmlIndexAttachmentStepDefinition({
      getStartContract: () => startContract,
      getSpaces: () => undefined,
    });

    const context = buildHandlerContext({
      originId: 'doc-1',
      attachmentType: 'custom',
      action: 'delete',
    });

    const result = await definition.handler(context as any);

    expect(startContract.indexAttachment).toHaveBeenCalledWith({
      request: expect.anything(),
      originId: 'doc-1',
      attachmentType: 'custom',
      action: 'delete',
      // Workflow-driven deletes are direct: they wipe everything for the origin.
      source: 'direct',
    });
    expect(startContract.indexAttachment.mock.calls[0][0].chunks).toBeUndefined();
    expect(result).toEqual({
      output: expect.objectContaining({
        action: 'delete',
        spaceId: 'default',
        chunkCount: 0,
        acknowledged: true,
      }),
    });
  });

  it('returns an error result when the attachment_type is not registered', async () => {
    const startContract = buildStartContract();
    startContract.getTypeDefinition.mockReturnValueOnce(undefined);
    const definition = createSmlIndexAttachmentStepDefinition({
      getStartContract: () => startContract,
      getSpaces: () => undefined,
    });

    const context = buildHandlerContext({
      originId: 'doc-1',
      attachmentType: 'unknown',
      action: 'create',
      chunks: [{ type: 'unknown', title: 't', content: 'c' }],
    });

    const result = await definition.handler(context as any);
    expect(result.output).toBeUndefined();
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe("Unknown SML attachment type: 'unknown'");
    expect(startContract.indexAttachment).not.toHaveBeenCalled();
  });

  it('returns an error result and logs when indexAttachment throws', async () => {
    const startContract = buildStartContract();
    startContract.indexAttachment.mockRejectedValueOnce(new Error('ES write failed'));
    const definition = createSmlIndexAttachmentStepDefinition({
      getStartContract: () => startContract,
      getSpaces: () => undefined,
    });

    const context = buildHandlerContext({
      originId: 'doc-1',
      attachmentType: 'custom',
      action: 'create',
      chunks: [{ type: 'custom', title: 't', content: 'c' }],
    });

    const result = await definition.handler(context as any);
    expect(result.output).toBeUndefined();
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('ES write failed');
    expect(context.logger.error).toHaveBeenCalledWith(
      'SML index_attachment workflow step failed',
      expect.any(Error)
    );
  });

  it('returns an error when the start contract is not yet available', async () => {
    const definition = createSmlIndexAttachmentStepDefinition({
      getStartContract: () => {
        throw new Error('start contract not ready');
      },
      getSpaces: () => undefined,
    });

    const context = buildHandlerContext({
      originId: 'doc-1',
      attachmentType: 'custom',
      action: 'create',
      chunks: [{ type: 'custom', title: 't', content: 'c' }],
    });

    const result = await definition.handler(context as any);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('start contract not ready');
  });
});
