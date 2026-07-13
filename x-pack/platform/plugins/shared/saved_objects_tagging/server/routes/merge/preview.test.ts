/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, coreMock } from '@kbn/core/server/mocks';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { MergeError } from '../../services';
import { registerMergePreviewRoute } from './preview';

describe('registerMergePreviewRoute', () => {
  let router: { post: jest.Mock; handleLegacyErrors: jest.Mock };
  let mergeService: {
    normalizeFromIds: jest.Mock;
    assertTagsNotManaged: jest.Mock;
    getUpdatableTaggableTypes: jest.Mock;
    getKnownTaggableTypes: jest.Mock;
    computeAffectedCount: jest.Mock;
    checkStartGate: jest.Mock;
    checkDeleteSourcesGate: jest.Mock;
  };
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let internalClient: jest.Mocked<SavedObjectsClientContract>;

  const getHandler = () => router.post.mock.calls[0][1];

  beforeEach(() => {
    router = {
      post: jest.fn(),
      handleLegacyErrors: jest.fn((fn) => fn),
    };
    mergeService = {
      normalizeFromIds: jest.fn((toId, fromIds) => fromIds.filter((id: string) => id !== toId)),
      assertTagsNotManaged: jest.fn().mockResolvedValue(undefined),
      getUpdatableTaggableTypes: jest.fn().mockResolvedValue(['dashboard']),
      getKnownTaggableTypes: jest.fn().mockReturnValue(['dashboard', 'osquery-pack']),
      computeAffectedCount: jest
        .fn()
        .mockResolvedValue({ affectedCount: 3, byType: { dashboard: 3 } }),
      checkStartGate: jest.fn().mockResolvedValue({ allowed: true, reasons: [] }),
      checkDeleteSourcesGate: jest.fn().mockResolvedValue({ allowed: true, reasons: [] }),
    };

    coreStart = coreMock.createStart();
    internalClient = coreStart.savedObjects.getUnsafeInternalClient() as jest.Mocked<
      typeof internalClient
    >;
    internalClient.find.mockResolvedValue({
      saved_objects: [],
      total: 3,
      page: 1,
      per_page: 0,
    });

    registerMergePreviewRoute(router as any, {
      getStartServices: () =>
        Promise.resolve([coreStart, { taskManager: taskManagerMock.createStart() }, undefined]),
    });
  });

  const callHandler = async (body: object) => {
    const req = httpServerMock.createKibanaRequest({ body });
    const res = httpServerMock.createResponseFactory();
    const ctx = { tags: Promise.resolve({ mergeService }) };
    await getHandler()(ctx, req, res);
    return res;
  };

  it('rejects when `fromIds` is empty after removing `toId`', async () => {
    const res = await callHandler({ toId: 'to-1', fromIds: ['to-1'] });

    expect(res.badRequest).toHaveBeenCalledTimes(1);
    expect(mergeService.assertTagsNotManaged).not.toHaveBeenCalled();
  });

  it('rejects with the MergeError status when a tag is managed', async () => {
    mergeService.assertTagsNotManaged.mockRejectedValue(new MergeError('nope', 400));

    const res = await callHandler({ toId: 'to-1', fromIds: ['from-1'] });

    expect(res.customError).toHaveBeenCalledWith({ statusCode: 400, body: 'nope' });
  });

  it('rethrows non-MergeError errors from `assertTagsNotManaged`', async () => {
    mergeService.assertTagsNotManaged.mockRejectedValue(new Error('boom'));

    await expect(callHandler({ toId: 'to-1', fromIds: ['from-1'] })).rejects.toThrow('boom');
  });

  it('returns the affected count, byType breakdown, and gate results', async () => {
    const res = await callHandler({ toId: 'to-1', fromIds: ['from-1'] });

    expect(mergeService.computeAffectedCount).toHaveBeenCalledWith({
      fromIds: ['from-1'],
      types: ['dashboard'],
    });
    // `checkStartGate` is gated on the just-computed `affectedCount`, not a generic
    // "can update any taggable type" signal — see merge_service.ts's doc comment.
    expect(mergeService.checkStartGate).toHaveBeenCalledWith({ affectedCount: 3 });
    expect(res.ok).toHaveBeenCalledWith({
      body: {
        affectedCount: 3,
        byType: { dashboard: 3 },
        canStartMerge: { allowed: true, reasons: [] },
        canRequestDeleteSources: { allowed: true, reasons: [] },
      },
    });
  });

  it('gates deleteSources on the true (unscoped) set of affected types, not the caller-scoped one', async () => {
    // Both known taggable types come back with references from the internal client, so Gate 2a
    // must be checked against both — not just whatever the per-user client could see.
    await callHandler({ toId: 'to-1', fromIds: ['from-1'] });

    expect(coreStart.savedObjects.getUnsafeInternalClient).toHaveBeenCalled();
    expect(internalClient.find).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'dashboard' })
    );
    expect(internalClient.find).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'osquery-pack' })
    );
    expect(mergeService.checkDeleteSourcesGate).toHaveBeenCalledWith({
      updatableTypes: ['dashboard'],
      affectedTypes: ['dashboard', 'osquery-pack'],
    });
  });

  it('surfaces gate failures with their reasons', async () => {
    mergeService.checkStartGate.mockResolvedValue({
      allowed: false,
      reasons: ['User cannot manage tag saved objects'],
    });

    const res = await callHandler({ toId: 'to-1', fromIds: ['from-1'] });

    expect(res.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          canStartMerge: { allowed: false, reasons: ['User cannot manage tag saved objects'] },
        }),
      })
    );
  });
});
