/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { KibanaResponseFactory } from '@kbn/core-http-server';
import {
  ChainResolutionError,
  EntitiesNotFoundError,
  EntityHasAliasesError,
  MixedEntityTypesError,
  ResolutionSearchTruncatedError,
  ResolutionUpdateError,
  SelfLinkError,
} from '../../../domain/errors';
import type { EntityStoreRequestHandlerContext } from '../../../types';
import type { ResolutionClient } from '../../../domain/resolution';
import { handleResolutionLink } from './link';

function createMockContext(
  resolutionClient: Partial<ResolutionClient>
): EntityStoreRequestHandlerContext {
  return {
    entityStore: Promise.resolve({
      logger: loggerMock.create(),
      resolutionClient: resolutionClient as ResolutionClient,
    }),
  } as unknown as EntityStoreRequestHandlerContext;
}

function createMockResponse() {
  return {
    ok: jest.fn(({ body }) => ({ status: 200, payload: body })),
    customError: jest.fn(({ statusCode, body }) => ({ status: statusCode, payload: body })),
    badRequest: jest.fn(({ body }) => ({ status: 400, payload: body })),
  } as unknown as KibanaResponseFactory;
}

describe('handleResolutionLink', () => {
  let mockLinkEntities: jest.Mock;

  beforeEach(() => {
    mockLinkEntities = jest.fn();
  });

  it('returns the link result on success', async () => {
    const result = {
      linked: ['entity-1', 'entity-2'],
      skipped: ['entity-3'],
      target_id: 'target-1',
      entity_type: 'user',
    };
    mockLinkEntities.mockResolvedValue(result);

    const ctx = createMockContext({ linkEntities: mockLinkEntities });
    const req = {
      body: { target_id: 'target-1', entity_ids: ['entity-1', 'entity-2', 'entity-3'] },
    } as never;
    const res = createMockResponse();

    await handleResolutionLink(ctx, req, res);

    expect(mockLinkEntities).toHaveBeenCalledWith(
      'target-1',
      ['entity-1', 'entity-2', 'entity-3'],
      { awaitVisibility: true }
    );
    expect(res.ok).toHaveBeenCalledWith({ body: result });
  });

  it.each([
    [new SelfLinkError('target-1')],
    [new MixedEntityTypesError(['user', 'host'])],
    [new ChainResolutionError('entity-1', 'other')],
    [new EntityHasAliasesError('entity-1', ['alias-1'])],
    [new ResolutionSearchTruncatedError('findEntitiesWithAliases', 1, 100)],
    [new EntitiesNotFoundError(['missing'])],
  ])('maps %s to a 400 response', async (error) => {
    mockLinkEntities.mockRejectedValue(error);

    const ctx = createMockContext({ linkEntities: mockLinkEntities });
    const req = { body: { target_id: 'target-1', entity_ids: ['entity-1'] } } as never;
    const res = createMockResponse();

    const response = await handleResolutionLink(ctx, req, res);

    expect(response.status).toBe(400);
  });

  it('re-throws resolution update errors', async () => {
    mockLinkEntities.mockRejectedValue(new ResolutionUpdateError('linking', []));

    const ctx = createMockContext({ linkEntities: mockLinkEntities });
    const req = { body: { target_id: 'target-1', entity_ids: ['entity-1'] } } as never;

    await expect(handleResolutionLink(ctx, req, createMockResponse())).rejects.toThrow(
      ResolutionUpdateError
    );
  });

  it('re-throws unknown errors', async () => {
    mockLinkEntities.mockRejectedValue(new Error('unexpected'));

    const ctx = createMockContext({ linkEntities: mockLinkEntities });
    const req = { body: { target_id: 'target-1', entity_ids: ['entity-1'] } } as never;

    await expect(handleResolutionLink(ctx, req, createMockResponse())).rejects.toThrow(
      'unexpected'
    );
  });
});
