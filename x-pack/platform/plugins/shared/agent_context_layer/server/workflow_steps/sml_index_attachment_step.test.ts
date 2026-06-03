/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SmlIndexAttachmentInputSchema } from '../../common/workflow_steps/sml_index_attachment_step';
import type { AgentContextLayerPluginStart } from '../types';
import { createSmlIndexAttachmentStepDefinition } from './sml_index_attachment_step';

const buildStartContract = (): jest.Mocked<AgentContextLayerPluginStart> => ({
  search: jest.fn(),
  getDocuments: jest.fn(),
  // Default: treat any type as registered. Individual tests can override.
  getTypeDefinition: jest.fn().mockImplementation((id: string) => ({ id } as any)),
  resolveSmlAttachItems: jest.fn(),
  indexAttachment: jest.fn().mockResolvedValue(undefined),
  deleteAttachment: jest.fn().mockResolvedValue(undefined),
});

// Reuse the Zod schema as the source of truth for the test input shape so
// the test fixtures cannot silently drift from the contract.
type StepInput = z.infer<typeof SmlIndexAttachmentInputSchema>;

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

// Minimal `spaces` mock — only `spacesService.getSpaceId` is consumed. The
// `Pick` makes the partial-mock intent explicit so we don't cast to `any`.
type MockedSpaces = Pick<SpacesPluginStart, 'spacesService'>;

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

  it('forwards caller-supplied chunks as content-mode write for upsert', async () => {
    const startContract = buildStartContract();
    const spaces: MockedSpaces = {
      spacesService: { getSpaceId: jest.fn().mockReturnValue('test-space') } as any,
    };
    const definition = createSmlIndexAttachmentStepDefinition({
      getStartContract: () => startContract,
      getSpaces: () => spaces as SpacesPluginStart,
    });

    const request = httpServerMock.createKibanaRequest();
    const context = buildHandlerContext(
      {
        originId: 'doc-42',
        attachmentType: 'custom',
        action: 'upsert',
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
      // 'upsert' is translated to 'create' on the start contract — see
      // handler comment for why.
      action: 'create',
      // Workflow writes always go through content-mode → manual chunks.
      content: [
        {
          type: 'custom',
          title: 'My title',
          content: 'My content',
          description: 'desc',
        },
      ],
    });
    expect(result).toEqual({
      output: {
        originId: 'doc-42',
        attachmentType: 'custom',
        action: 'upsert',
        spaceId: 'test-space',
        requestedChunkCount: 1,
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
      action: 'upsert',
      chunks: [{ type: 'custom', title: 't', content: 'c' }],
    });

    await definition.handler(context as any);
    const callArgs = startContract.indexAttachment.mock.calls[0][0];
    expect((callArgs as any).content).toEqual([{ type: 'custom', title: 't', content: 'c' }]);
    expect(Object.keys((callArgs as any).content[0])).toEqual(['type', 'title', 'content']);
  });

  it('preserves optional chunk fields when provided', async () => {
    const startContract = buildStartContract();
    const definition = createSmlIndexAttachmentStepDefinition({
      getStartContract: () => startContract,
      getSpaces: () => undefined,
    });

    const context = buildHandlerContext({
      originId: 'doc-1',
      attachmentType: 'custom',
      action: 'upsert',
      chunks: [
        {
          type: 'custom',
          title: 't',
          content: 'c',
          description: 'd',
          user_id: 'u',
          references: ['r1'],
          permissions: ['p1'],
        },
      ],
    });

    await definition.handler(context as any);
    const callArgs = startContract.indexAttachment.mock.calls[0][0];
    expect((callArgs as any).content[0]).toEqual({
      type: 'custom',
      title: 't',
      content: 'c',
      description: 'd',
      user_id: 'u',
      references: ['r1'],
      permissions: ['p1'],
    });
  });

  it('handles delete by calling deleteAttachment with ingestionMethod="all" and reports requestedChunkCount = 0', async () => {
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

    expect(startContract.deleteAttachment).toHaveBeenCalledWith({
      request: expect.anything(),
      originId: 'doc-1',
      attachmentType: 'custom',
      // Workflow steps "own" the origin they wrote → wipe everything.
      // 'all' tells the AGL indexer to skip the ingestion_method filter
      // and remove every chunk for the origin (manual + crawled).
      ingestionMethod: 'all',
    });
    // Delete uses the dedicated `deleteAttachment` method on the contract,
    // not `indexAttachment` — keeps "delete with custom scope" out of the
    // index-mutation API surface.
    expect(startContract.indexAttachment).not.toHaveBeenCalled();
    expect(result).toEqual({
      output: expect.objectContaining({
        action: 'delete',
        spaceId: 'default',
        requestedChunkCount: 0,
        acknowledged: true,
      }),
    });
  });

  it('allows delete to proceed when the attachment type is not registered', async () => {
    const startContract = buildStartContract();
    startContract.getTypeDefinition.mockReturnValue(undefined);
    const definition = createSmlIndexAttachmentStepDefinition({
      getStartContract: () => startContract,
      getSpaces: () => undefined,
    });

    // Cleanup must remain functional after the plugin that registered the
    // type is disabled — otherwise stale chunks become unreachable from
    // the workflow surface.
    const context = buildHandlerContext({
      originId: 'doc-1',
      attachmentType: 'unregistered-but-was-written-before',
      action: 'delete',
    });

    const result = await definition.handler(context as any);

    expect(startContract.deleteAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        attachmentType: 'unregistered-but-was-written-before',
        ingestionMethod: 'all',
      })
    );
    // The type-definition lookup must NOT be consulted for delete.
    expect(startContract.getTypeDefinition).not.toHaveBeenCalled();
    expect(result.error).toBeUndefined();
    expect(result.output?.action).toBe('delete');
  });

  it('returns an error result when upsert targets an unregistered attachment type', async () => {
    const startContract = buildStartContract();
    startContract.getTypeDefinition.mockReturnValueOnce(undefined);
    const definition = createSmlIndexAttachmentStepDefinition({
      getStartContract: () => startContract,
      getSpaces: () => undefined,
    });

    const context = buildHandlerContext({
      originId: 'doc-1',
      attachmentType: 'unknown',
      action: 'upsert',
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
      action: 'upsert',
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
      action: 'upsert',
      chunks: [{ type: 'custom', title: 't', content: 'c' }],
    });

    const result = await definition.handler(context as any);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('start contract not ready');
  });

  it('falls back to "default" space when spaces service is unavailable', async () => {
    const startContract = buildStartContract();
    const definition = createSmlIndexAttachmentStepDefinition({
      getStartContract: () => startContract,
      getSpaces: () => undefined,
    });

    const context = buildHandlerContext({
      originId: 'doc-1',
      attachmentType: 'custom',
      action: 'upsert',
      chunks: [{ type: 'custom', title: 't', content: 'c' }],
    });

    const result = await definition.handler(context as any);
    expect(result.output?.spaceId).toBe('default');
  });
});
