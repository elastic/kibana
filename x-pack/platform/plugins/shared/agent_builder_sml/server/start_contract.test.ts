/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { asSpaceId } from '@kbn/core-spaces-common';
import type { SmlService } from './services/sml/types';
import { buildIndexAttachment, buildDeleteAttachment } from './start_contract';

// Hand-built rather than `coreMock` — these builders only touch
// `elasticsearch.client.asInternalUser` and `savedObjects.getScopedClient`.
const buildDeps = () => {
  const smlService = {
    indexAttachment: jest.fn().mockResolvedValue(undefined),
    deleteAttachment: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<Pick<SmlService, 'indexAttachment' | 'deleteAttachment'>> &
    SmlService;
  const soClient = {};
  const savedObjects = {
    getScopedClient: jest.fn().mockReturnValue(soClient),
  } as any;
  const esInternalClient = {};
  const elasticsearch = {
    client: { asInternalUser: esInternalClient },
  } as any;
  const logger = loggerMock.create();

  return {
    smlService,
    savedObjects,
    soClient,
    elasticsearch,
    esInternalClient,
    spaces: undefined,
    logger,
  };
};

const baseParams = {
  request: httpServerMock.createKibanaRequest(),
  originId: 'origin-1',
  attachmentType: 'dashboard',
  action: 'create' as const,
};

const paramsInSpace = (spaceId: string) => ({
  ...baseParams,
  request: httpServerMock.createKibanaRequest({ spaceId: asSpaceId(spaceId) }),
});

describe('buildIndexAttachment', () => {
  it('forwards force to smlService.indexAttachment', async () => {
    const deps = buildDeps();
    const indexAttachment = buildIndexAttachment(deps);

    await indexAttachment({ ...paramsInSpace('space-1'), force: true });

    expect(deps.smlService.indexAttachment).toHaveBeenCalledTimes(1);
    const callArgs = deps.smlService.indexAttachment.mock.calls[0][0];
    expect(callArgs.force).toBe(true);
    expect(callArgs.spaces).toEqual(['space-1']);
    expect(callArgs.esClient).toBe(deps.esInternalClient);
    expect(callArgs.savedObjectsClient).toBe(deps.soClient);
    expect(callArgs.clientHasSpacesExtension).toBe(true);
  });

  it('uses the default space when the request targets it and no spaceId is provided', async () => {
    const deps = buildDeps();
    const indexAttachment = buildIndexAttachment(deps);

    await indexAttachment(baseParams);

    const callArgs = deps.smlService.indexAttachment.mock.calls[0][0];
    expect(callArgs.spaces).toEqual(['default']);
  });

  it('uses the explicit spaceId over the request space', async () => {
    const deps = buildDeps();
    const indexAttachment = buildIndexAttachment(deps);

    await indexAttachment({ ...paramsInSpace('auto-space'), spaceId: 'explicit-space' });

    const callArgs = deps.smlService.indexAttachment.mock.calls[0][0];
    expect(callArgs.spaces).toEqual(['explicit-space']);
  });

  it('passes includedHiddenTypes through to getScopedClient when provided', async () => {
    const deps = buildDeps();
    const indexAttachment = buildIndexAttachment(deps);

    await indexAttachment({
      ...baseParams,
      includedHiddenTypes: ['hidden-type'],
    });

    expect(deps.savedObjects.getScopedClient).toHaveBeenCalledWith(
      baseParams.request,
      expect.objectContaining({ includedHiddenTypes: ['hidden-type'] })
    );
  });
});

describe('buildDeleteAttachment', () => {
  it('forwards ingestionMethod and spaces when provided', async () => {
    const deps = buildDeps();
    const deleteAttachment = buildDeleteAttachment(deps);

    await deleteAttachment({ ...paramsInSpace('space-1'), ingestionMethod: 'all', strict: true });

    expect(deps.smlService.deleteAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ ingestionMethod: 'all', spaces: ['space-1'], strict: true })
    );
  });

  it('omits ingestionMethod from the call when not supplied', async () => {
    const deps = buildDeps();
    const deleteAttachment = buildDeleteAttachment(deps);

    await deleteAttachment(baseParams);

    const callArgs = deps.smlService.deleteAttachment.mock.calls[0][0];
    expect('ingestionMethod' in callArgs).toBe(false);
  });

  it('derives space from the request and passes as spaces array', async () => {
    const deps = buildDeps();
    const deleteAttachment = buildDeleteAttachment(deps);

    await deleteAttachment(paramsInSpace('space-1'));

    const callArgs = deps.smlService.deleteAttachment.mock.calls[0][0];
    expect(callArgs.spaces).toEqual(['space-1']);
  });

  it('uses the "default" space when the request targets it and no spaceId is provided', async () => {
    const deps = buildDeps();
    const deleteAttachment = buildDeleteAttachment(deps);

    await deleteAttachment(baseParams);

    const callArgs = deps.smlService.deleteAttachment.mock.calls[0][0];
    expect(callArgs.spaces).toEqual(['default']);
  });

  it('uses explicit spaceId over the request space', async () => {
    const deps = buildDeps();
    const deleteAttachment = buildDeleteAttachment(deps);

    await deleteAttachment({ ...paramsInSpace('auto-space'), spaceId: 'explicit-space' });

    const callArgs = deps.smlService.deleteAttachment.mock.calls[0][0];
    expect(callArgs.spaces).toEqual(['explicit-space']);
  });
});
