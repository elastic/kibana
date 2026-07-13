/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { registerMergePreviewObjectsRoute } from './preview_objects';

describe('registerMergePreviewObjectsRoute', () => {
  let router: { get: jest.Mock; handleLegacyErrors: jest.Mock };
  let mergeService: {
    normalizeFromIds: jest.Mock;
    getUpdatableTaggableTypes: jest.Mock;
    findAffectedObjects: jest.Mock;
  };

  const getHandler = () => router.get.mock.calls[0][1];

  beforeEach(() => {
    router = {
      get: jest.fn(),
      handleLegacyErrors: jest.fn((fn) => fn),
    };
    mergeService = {
      normalizeFromIds: jest.fn((toId, fromIds) => fromIds.filter((id: string) => id !== toId)),
      getUpdatableTaggableTypes: jest.fn().mockResolvedValue(['dashboard']),
      findAffectedObjects: jest.fn().mockResolvedValue({
        objects: [{ type: 'dashboard', id: 'obj-1', title: 'My dashboard' }],
        total: 25,
      }),
    };

    registerMergePreviewObjectsRoute(router as any);
  });

  const callHandler = async (query: object) => {
    const req = httpServerMock.createKibanaRequest({ query });
    const res = httpServerMock.createResponseFactory();
    const ctx = { tags: Promise.resolve({ mergeService }) };
    await getHandler()(ctx, req, res);
    return res;
  };

  it('rejects when `fromIds` is empty after removing `toId`', async () => {
    const res = await callHandler({ toId: 'to-1', fromIds: 'to-1', page: 1, perPage: 20 });

    expect(res.badRequest).toHaveBeenCalledTimes(1);
    expect(mergeService.findAffectedObjects).not.toHaveBeenCalled();
  });

  it('normalizes a single-string `fromIds` query param into an array', async () => {
    await callHandler({ toId: 'to-1', fromIds: 'from-1', page: 1, perPage: 20 });

    expect(mergeService.normalizeFromIds).toHaveBeenCalledWith('to-1', ['from-1']);
  });

  it('passes pagination through and returns the objects/total/page/perPage', async () => {
    const res = await callHandler({
      toId: 'to-1',
      fromIds: ['from-1', 'from-2'],
      page: 3,
      perPage: 5,
    });

    expect(mergeService.findAffectedObjects).toHaveBeenCalledWith({
      fromIds: ['from-1', 'from-2'],
      types: ['dashboard'],
      page: 3,
      perPage: 5,
    });
    expect(res.ok).toHaveBeenCalledWith({
      body: {
        objects: [{ type: 'dashboard', id: 'obj-1', title: 'My dashboard' }],
        total: 25,
        page: 3,
        perPage: 5,
      },
    });
  });
});
