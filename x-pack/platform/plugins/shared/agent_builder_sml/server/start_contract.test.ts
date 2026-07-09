/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { SmlChunk, SmlPermissions, SmlService } from './services/sml/types';
import { buildIndexAttachment, buildDeleteAttachment } from './start_contract';

// Hand-built rather than `coreMock` — these builders only touch
// `elasticsearch.client.asInternalUser` and `savedObjects.getScopedClient`.
const buildDeps = ({ spaceFromRequest }: { spaceFromRequest?: string } = {}) => {
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
  const spaces = spaceFromRequest
    ? ({ spacesService: { getSpaceId: jest.fn().mockReturnValue(spaceFromRequest) } } as any)
    : undefined;
  const logger = loggerMock.create();

  return { smlService, savedObjects, soClient, elasticsearch, esInternalClient, spaces, logger };
};

const baseParams = {
  request: httpServerMock.createKibanaRequest(),
  originId: 'origin-1',
  attachmentType: 'dashboard',
  action: 'create' as const,
};

const chunks: SmlChunk[] = [{ type: 'dashboard', content: 'some content', title: 'title' }];

const permissions: SmlPermissions = {
  kibana: { privileges: [{ name: 'saved_object:dashboard/get' }] },
  elasticsearch: { indices: [] },
};

describe('buildIndexAttachment', () => {
  it('forwards permissions and createdAt to smlService.indexAttachment in content mode', async () => {
    const deps = buildDeps({ spaceFromRequest: 'space-1' });
    const indexAttachment = buildIndexAttachment(deps);

    await indexAttachment({
      ...baseParams,
      content: chunks,
      createdAt: '2024-01-01T00:00:00Z',
      permissions,
    });

    expect(deps.smlService.indexAttachment).toHaveBeenCalledTimes(1);
    const callArgs = deps.smlService.indexAttachment.mock.calls[0][0];
    if (callArgs.content === undefined) {
      throw new Error('expected content-mode params');
    }
    expect(callArgs.content).toBe(chunks);
    expect(callArgs.createdAt).toBe('2024-01-01T00:00:00Z');
    expect(callArgs.permissions).toEqual(permissions);
    expect(callArgs.spaces).toEqual(['space-1']);
    expect(callArgs.esClient).toBe(deps.esInternalClient);
    expect(callArgs.savedObjectsClient).toBe(deps.soClient);
  });

  it('omits permissions and createdAt from the call when not supplied in content mode', async () => {
    const deps = buildDeps({ spaceFromRequest: 'space-1' });
    const indexAttachment = buildIndexAttachment(deps);

    await indexAttachment({ ...baseParams, content: chunks });

    const callArgs = deps.smlService.indexAttachment.mock.calls[0][0];
    if (callArgs.content === undefined) {
      throw new Error('expected content-mode params');
    }
    expect(callArgs.content).toBe(chunks);
    expect('permissions' in callArgs).toBe(false);
    expect('createdAt' in callArgs).toBe(false);
  });

  it('forwards force in origin mode (no content)', async () => {
    const deps = buildDeps({ spaceFromRequest: 'space-1' });
    const indexAttachment = buildIndexAttachment(deps);

    await indexAttachment({ ...baseParams, force: true });

    const callArgs = deps.smlService.indexAttachment.mock.calls[0][0];
    expect(callArgs.force).toBe(true);
    expect('content' in callArgs).toBe(false);
  });

  it('falls back to the default space when no spaces service and no spaceId are provided', async () => {
    const deps = buildDeps();
    const indexAttachment = buildIndexAttachment(deps);

    await indexAttachment({ ...baseParams, content: chunks });

    const callArgs = deps.smlService.indexAttachment.mock.calls[0][0];
    expect(callArgs.spaces).toEqual(['default']);
  });

  it('uses the explicit spaceId over the spaces service', async () => {
    const deps = buildDeps({ spaceFromRequest: 'auto-space' });
    const indexAttachment = buildIndexAttachment(deps);

    await indexAttachment({ ...baseParams, content: chunks, spaceId: 'explicit-space' });

    const callArgs = deps.smlService.indexAttachment.mock.calls[0][0];
    expect(callArgs.spaces).toEqual(['explicit-space']);
  });

  it('passes includedHiddenTypes through to getScopedClient when provided', async () => {
    const deps = buildDeps();
    const indexAttachment = buildIndexAttachment(deps);

    await indexAttachment({
      ...baseParams,
      content: chunks,
      includedHiddenTypes: ['hidden-type'],
    });

    expect(deps.savedObjects.getScopedClient).toHaveBeenCalledWith(
      baseParams.request,
      expect.objectContaining({ includedHiddenTypes: ['hidden-type'] })
    );
  });
});

describe('buildDeleteAttachment', () => {
  it('forwards ingestionMethod when provided', async () => {
    const deps = buildDeps({ spaceFromRequest: 'space-1' });
    const deleteAttachment = buildDeleteAttachment(deps);

    await deleteAttachment({ ...baseParams, ingestionMethod: 'all' });

    expect(deps.smlService.deleteAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ ingestionMethod: 'all', spaces: ['space-1'] })
    );
  });

  it('omits ingestionMethod from the call when not supplied', async () => {
    const deps = buildDeps();
    const deleteAttachment = buildDeleteAttachment(deps);

    await deleteAttachment(baseParams);

    const callArgs = deps.smlService.deleteAttachment.mock.calls[0][0];
    expect('ingestionMethod' in callArgs).toBe(false);
  });
});
