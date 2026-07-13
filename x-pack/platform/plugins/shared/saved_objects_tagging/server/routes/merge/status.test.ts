/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, coreMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { registerMergeStatusRoute } from './status';

describe('registerMergeStatusRoute', () => {
  let router: { get: jest.Mock; handleLegacyErrors: jest.Mock };
  let taskManager: ReturnType<typeof taskManagerMock.createStart>;

  const getHandler = () => router.get.mock.calls[0][1];

  beforeEach(() => {
    router = {
      get: jest.fn(),
      handleLegacyErrors: jest.fn((fn) => fn),
    };
    taskManager = taskManagerMock.createStart();

    registerMergeStatusRoute(router as any, {
      getStartServices: () =>
        Promise.resolve([coreMock.createStart(), { taskManager, security: undefined }, undefined]),
      spacesService: undefined,
    });
  });

  const callHandler = async () => {
    const req = httpServerMock.createKibanaRequest();
    const res = httpServerMock.createResponseFactory();
    await getHandler()({}, req, res);
    return res;
  };

  it('returns an idle status when there is no task for this space', async () => {
    taskManager.get.mockRejectedValue(new Error('not found'));

    const res = await callHandler();

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        status: 'idle',
        phase: 'complete',
        progress: { updatedCount: 0 },
        deletion: [],
        errors: { count: 0, samples: [] },
      },
    });
  });

  it('maps an in-progress task instance to the status response shape', async () => {
    taskManager.get.mockResolvedValue(
      taskManagerMock.createTask({
        params: { toId: 'to-1', fromIds: ['from-1'], deleteSources: false },
        state: {
          status: 'in_progress',
          phase: 'updating',
          startedAt: '2024-01-01T00:00:00.000Z',
          totalAffected: 200,
          updatedCount: 50,
          deletion: [],
          errors: { count: 0, samples: [] },
        },
      })
    );

    const res = await callHandler();

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        status: 'in_progress',
        phase: 'updating',
        job: {
          toId: 'to-1',
          fromIds: ['from-1'],
          deleteSources: false,
          startedAt: '2024-01-01T00:00:00.000Z',
        },
        progress: { totalAffected: 200, updatedCount: 50, percent: 25 },
        deletion: [],
        errors: { count: 0, samples: [] },
      },
    });
  });

  describe('percent, when `deleteSources` is requested', () => {
    // `finalizing` (deleting source tags) is real remaining work after every saved object has
    // been updated, so `updating` only accounts for the first half of the bar and `finalizing`
    // the second half — otherwise the bar would read 100% before source tags are even touched.
    const baseParams = { toId: 'to-1', fromIds: ['from-1', 'from-2'], deleteSources: true };

    it('caps the `updating` phase contribution at 50%, even once every object is updated', async () => {
      taskManager.get.mockResolvedValue(
        taskManagerMock.createTask({
          params: baseParams,
          state: {
            status: 'in_progress',
            phase: 'updating',
            startedAt: '2024-01-01T00:00:00.000Z',
            totalAffected: 200,
            updatedCount: 200,
            deletion: [],
            errors: { count: 0, samples: [] },
          },
        })
      );

      const res = await callHandler();

      expect(res.ok).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({ progress: expect.objectContaining({ percent: 50 }) }),
        })
      );
    });

    it('reports 50-100% during `finalizing`, based on how many source tags have been checked', async () => {
      taskManager.get.mockResolvedValue(
        taskManagerMock.createTask({
          params: baseParams,
          state: {
            status: 'in_progress',
            phase: 'finalizing',
            startedAt: '2024-01-01T00:00:00.000Z',
            totalAffected: 200,
            updatedCount: 200,
            deletion: [{ id: 'from-1', deleted: true }], // 1 of 2 fromIds processed
            errors: { count: 0, samples: [] },
          },
        })
      );

      const res = await callHandler();

      expect(res.ok).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({ progress: expect.objectContaining({ percent: 75 }) }),
        })
      );
    });

    it('reports 100% once the job reaches `complete`', async () => {
      taskManager.get.mockResolvedValue(
        taskManagerMock.createTask({
          params: baseParams,
          state: {
            status: 'success',
            phase: 'complete',
            startedAt: '2024-01-01T00:00:00.000Z',
            totalAffected: 200,
            updatedCount: 200,
            deletion: [
              { id: 'from-1', deleted: true },
              { id: 'from-2', deleted: true },
            ],
            errors: { count: 0, samples: [] },
          },
        })
      );

      const res = await callHandler();

      expect(res.ok).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({ progress: expect.objectContaining({ percent: 100 }) }),
        })
      );
    });
  });

  it('omits `percent` when `totalAffected` is not yet known (still scanning)', async () => {
    taskManager.get.mockResolvedValue(
      taskManagerMock.createTask({
        params: { toId: 'to-1', fromIds: ['from-1'], deleteSources: false },
        state: {
          status: 'in_progress',
          phase: 'scanning',
          startedAt: '2024-01-01T00:00:00.000Z',
          updatedCount: 0,
          deletion: [],
          errors: { count: 0, samples: [] },
        },
      })
    );

    const res = await callHandler();

    expect(res.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          progress: { totalAffected: undefined, updatedCount: 0, percent: undefined },
        }),
      })
    );
  });

  it('caps `percent` at 100 even if `updatedCount` exceeds `totalAffected`', async () => {
    taskManager.get.mockResolvedValue(
      taskManagerMock.createTask({
        params: { toId: 'to-1', fromIds: ['from-1'], deleteSources: false },
        state: {
          status: 'in_progress',
          phase: 'updating',
          startedAt: '2024-01-01T00:00:00.000Z',
          totalAffected: 10,
          updatedCount: 15,
          deletion: [],
          errors: { count: 0, samples: [] },
        },
      })
    );

    const res = await callHandler();

    expect(res.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ progress: expect.objectContaining({ percent: 100 }) }),
      })
    );
  });
});
