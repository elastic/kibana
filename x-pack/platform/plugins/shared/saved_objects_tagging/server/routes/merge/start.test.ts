/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, coreMock } from '@kbn/core/server/mocks';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { MergeError } from '../../services';
import { TAG_MERGE_TASK_TYPE } from '../../tasks/tag_merge';
import { registerMergeStartRoute } from './start';

describe('registerMergeStartRoute', () => {
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
  let taskManager: ReturnType<typeof taskManagerMock.createStart>;
  let security: ReturnType<typeof securityMock.createStart>;
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
      getKnownTaggableTypes: jest.fn().mockReturnValue(['dashboard']),
      computeAffectedCount: jest.fn().mockResolvedValue({ affectedCount: 1, byType: {} }),
      checkStartGate: jest.fn().mockResolvedValue({ allowed: true, reasons: [] }),
      checkDeleteSourcesGate: jest.fn().mockResolvedValue({ allowed: true, reasons: [] }),
    };
    taskManager = taskManagerMock.createStart();
    taskManager.get.mockRejectedValue(new Error('not found'));
    security = securityMock.createStart();
    coreStart = coreMock.createStart();
    internalClient = coreStart.savedObjects.getUnsafeInternalClient() as jest.Mocked<
      typeof internalClient
    >;
    internalClient.find.mockResolvedValue({
      saved_objects: [],
      total: 1,
      page: 1,
      per_page: 0,
    });

    registerMergeStartRoute(router as any, {
      getStartServices: () => Promise.resolve([coreStart, { taskManager, security }, undefined]),
      spacesService: undefined,
    });
  });

  const callHandler = async (body: object) => {
    const req = httpServerMock.createKibanaRequest({ body });
    const res = httpServerMock.createResponseFactory();
    const ctx = { tags: Promise.resolve({ mergeService }) };
    await getHandler()(ctx, req, res);
    return { req, res };
  };

  it('rejects when `fromIds` is empty after removing `toId`', async () => {
    const { res } = await callHandler({ toId: 'to-1', fromIds: ['to-1'], deleteSources: false });

    expect(res.badRequest).toHaveBeenCalledTimes(1);
    expect(mergeService.assertTagsNotManaged).not.toHaveBeenCalled();
  });

  it('rejects with the MergeError status when a tag is managed', async () => {
    mergeService.assertTagsNotManaged.mockRejectedValue(new MergeError('nope', 400));

    const { res } = await callHandler({ toId: 'to-1', fromIds: ['from-1'], deleteSources: false });

    expect(res.customError).toHaveBeenCalledWith({ statusCode: 400, body: 'nope' });
  });

  it('is forbidden when the baseline start gate disallows it', async () => {
    mergeService.checkStartGate.mockResolvedValue({ allowed: false, reasons: ['nope'] });

    const { res } = await callHandler({ toId: 'to-1', fromIds: ['from-1'], deleteSources: false });

    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'nope' } });
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });

  it('recomputes `affectedCount` independently (never trusts a client-supplied value) and gates on it', async () => {
    mergeService.computeAffectedCount.mockResolvedValue({
      affectedCount: 42,
      byType: { dashboard: 42 },
    });

    await callHandler({ toId: 'to-1', fromIds: ['from-1'], deleteSources: false });

    expect(mergeService.computeAffectedCount).toHaveBeenCalledWith({
      fromIds: ['from-1'],
      types: ['dashboard'],
    });
    expect(mergeService.checkStartGate).toHaveBeenCalledWith({ affectedCount: 42 });
  });

  it('is forbidden when `deleteSources` is requested but Gate 2a disallows it', async () => {
    mergeService.checkDeleteSourcesGate.mockResolvedValue({ allowed: false, reasons: ['nope'] });

    const { res } = await callHandler({ toId: 'to-1', fromIds: ['from-1'], deleteSources: true });

    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'nope' } });
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });

  it('does not check Gate 2a when `deleteSources` is false', async () => {
    (coreStart.savedObjects.getUnsafeInternalClient as jest.Mock).mockClear();

    await callHandler({ toId: 'to-1', fromIds: ['from-1'], deleteSources: false });

    expect(mergeService.checkDeleteSourcesGate).not.toHaveBeenCalled();
    expect(coreStart.savedObjects.getUnsafeInternalClient).not.toHaveBeenCalled();
  });

  it('gates deleteSources on the true (unscoped) set of affected types, not the caller-scoped one', async () => {
    mergeService.getKnownTaggableTypes.mockReturnValue(['dashboard', 'osquery-pack']);
    (internalClient.find as jest.Mock)
      .mockResolvedValueOnce({ saved_objects: [], total: 1, page: 1, per_page: 0 })
      .mockResolvedValueOnce({ saved_objects: [], total: 0, page: 1, per_page: 0 });

    await callHandler({ toId: 'to-1', fromIds: ['from-1'], deleteSources: true });

    expect(mergeService.checkDeleteSourcesGate).toHaveBeenCalledWith({
      updatableTypes: ['dashboard'],
      affectedTypes: ['dashboard'],
    });
  });

  it('returns a 501 when the security plugin is unavailable', async () => {
    registerMergeStartRoute(router as any, {
      getStartServices: () =>
        Promise.resolve([coreMock.createStart(), { taskManager, security: undefined }, undefined]),
      spacesService: undefined,
    });

    const req = httpServerMock.createKibanaRequest({
      body: { toId: 'to-1', fromIds: ['from-1'], deleteSources: false },
    });
    const res = httpServerMock.createResponseFactory();
    const ctx = { tags: Promise.resolve({ mergeService }) };
    await router.post.mock.calls[1][1](ctx, req, res);

    expect(res.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 501 }));
  });

  it('returns a 409 when a merge job is already in progress in this space', async () => {
    taskManager.get.mockResolvedValue(
      taskManagerMock.createTask({ state: { status: 'in_progress' } })
    );

    const { res } = await callHandler({ toId: 'to-1', fromIds: ['from-1'], deleteSources: false });

    expect(res.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 }));
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });

  it('removes a finished previous job before scheduling a new one', async () => {
    taskManager.get.mockResolvedValue(taskManagerMock.createTask({ state: { status: 'success' } }));

    await callHandler({ toId: 'to-1', fromIds: ['from-1'], deleteSources: false });

    expect(taskManager.removeIfExists).toHaveBeenCalledTimes(1);
    expect(taskManager.schedule).toHaveBeenCalledTimes(1);
  });

  it('schedules the task by passing `request` as the second `schedule()` argument (not a pre-built apiKey)', async () => {
    // This is what makes the job per-user: Task Manager itself grants the scoped API key from
    // `request` and persists it as `apiKey`/`userScope` on the task — setting those fields
    // directly on the first argument does nothing, since `taskInstanceToAttributes` strips them.
    const { req, res } = await callHandler({
      toId: 'to-1',
      fromIds: ['from-1'],
      deleteSources: true,
    });

    expect(security.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
    expect(taskManager.schedule).toHaveBeenCalledTimes(1);
    const [taskInstance, options] = taskManager.schedule.mock.calls[0];
    expect(taskInstance).toEqual(
      expect.objectContaining({
        taskType: TAG_MERGE_TASK_TYPE,
        params: { toId: 'to-1', fromIds: ['from-1'], deleteSources: true },
      })
    );
    expect(taskInstance).not.toHaveProperty('apiKey');
    expect(taskInstance).not.toHaveProperty('userScope');
    expect(options).toEqual({ request: req });
    expect(res.ok).toHaveBeenCalledWith({ body: {} });
  });
});
