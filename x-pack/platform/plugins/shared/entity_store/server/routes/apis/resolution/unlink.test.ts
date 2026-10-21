/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { KibanaResponseFactory } from '@kbn/core-http-server';
import {
  EntitiesNotFoundError,
  MixedEntityTypesError,
  ResolutionUpdateError,
} from '../../../domain/errors';
import type { EntityStoreRequestHandlerContext } from '../../../types';
import type { ResolutionClient } from '../../../domain/resolution';
import { handleResolutionUnlink } from './unlink';

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

describe('handleResolutionUnlink', () => {
  let mockUnlinkEntities: jest.Mock;

  beforeEach(() => {
    mockUnlinkEntities = jest.fn();
  });

  it('returns the unlink result on success', async () => {
    const result = { unlinked: ['alias-1'], skipped: ['entity-1'], entity_type: 'user' };
    mockUnlinkEntities.mockResolvedValue(result);

    const ctx = createMockContext({ unlinkEntities: mockUnlinkEntities });
    const req = { body: { entity_ids: ['alias-1', 'entity-1'] } } as never;
    const res = createMockResponse();

    await handleResolutionUnlink(ctx, req, res);

    expect(mockUnlinkEntities).toHaveBeenCalledWith(['alias-1', 'entity-1'], {
      awaitVisibility: true,
    });
    expect(res.ok).toHaveBeenCalledWith({ body: result });
  });

  it.each([
    [new EntitiesNotFoundError(['missing'])],
    [new MixedEntityTypesError(['user', 'host'])],
  ])('maps %s to a 400 response', async (error) => {
    mockUnlinkEntities.mockRejectedValue(error);

    const ctx = createMockContext({ unlinkEntities: mockUnlinkEntities });
    const req = { body: { entity_ids: ['alias-1'] } } as never;

    const response = await handleResolutionUnlink(ctx, req, createMockResponse());

    expect(response.status).toBe(400);
  });

  it('re-throws resolution update errors', async () => {
    mockUnlinkEntities.mockRejectedValue(new ResolutionUpdateError('unlinking', []));

    const ctx = createMockContext({ unlinkEntities: mockUnlinkEntities });
    const req = { body: { entity_ids: ['alias-1'] } } as never;

    await expect(handleResolutionUnlink(ctx, req, createMockResponse())).rejects.toThrow(
      ResolutionUpdateError
    );
  });

  it('re-throws unknown errors', async () => {
    mockUnlinkEntities.mockRejectedValue(new Error('unexpected'));

    const ctx = createMockContext({ unlinkEntities: mockUnlinkEntities });
    const req = { body: { entity_ids: ['alias-1'] } } as never;

    await expect(handleResolutionUnlink(ctx, req, createMockResponse())).rejects.toThrow(
      'unexpected'
    );
  });
});
