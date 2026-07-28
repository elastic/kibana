/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, coreMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { registerMergeCancelRoute } from './cancel';

describe('registerMergeCancelRoute', () => {
  let router: { post: jest.Mock; handleLegacyErrors: jest.Mock };
  let taskManager: ReturnType<typeof taskManagerMock.createStart>;

  const getHandler = () => router.post.mock.calls[0][1];

  beforeEach(() => {
    router = {
      post: jest.fn(),
      handleLegacyErrors: jest.fn((fn) => fn),
    };
    taskManager = taskManagerMock.createStart();
    taskManager.runSoon.mockResolvedValue(undefined as any);
    taskManager.bulkUpdateState.mockResolvedValue({ tasks: [], errors: [] });

    registerMergeCancelRoute(router as any, {
      getStartServices: () =>
        Promise.resolve([coreMock.createStart(), { taskManager, security: undefined }, undefined]),
      spacesService: undefined,
    });
  });

  const callHandler = async () => {
    const req = httpServerMock.createKibanaRequest();
    const res = httpServerMock.createResponseFactory();
    await getHandler()({}, req, res);
    return { req, res };
  };

  it('returns 404 when there is no merge job in this space', async () => {
    taskManager.get.mockRejectedValue(new Error('not found'));

    const { res } = await callHandler();

    expect(res.notFound).toHaveBeenCalledTimes(1);
    expect(taskManager.bulkUpdateState).not.toHaveBeenCalled();
  });

  it('is a no-op when the job has already finished', async () => {
    taskManager.get.mockResolvedValue(taskManagerMock.createTask({ state: { status: 'success' } }));

    const { res } = await callHandler();

    expect(taskManager.bulkUpdateState).not.toHaveBeenCalled();
    expect(res.ok).toHaveBeenCalledWith({ body: {} });
  });

  it('flips `cancelRequested` and nudges the task to run soon when in progress', async () => {
    // the cancel/status routes derive the task id from the space id, not from `task.id`
    const taskId = 'saved_objects_tagging:tag_merge:default';
    const task = taskManagerMock.createTask({ state: { status: 'in_progress' } });
    taskManager.get.mockResolvedValue(task);

    const { req, res } = await callHandler();

    // `{ request: req }` is required: this task carries an encrypted apiKey/userScope, and
    // TaskStore.getSoClientForUpdate throws synchronously if bulk-updating such a task without
    // a request to build the decrypting SO client from (see cancel.ts's comment).
    expect(taskManager.bulkUpdateState).toHaveBeenCalledWith([taskId], expect.any(Function), {
      request: req,
    });
    const [, stateMapFn] = taskManager.bulkUpdateState.mock.calls[0];
    expect(stateMapFn({ status: 'in_progress', cancelRequested: false }, taskId)).toEqual({
      status: 'in_progress',
      cancelRequested: true,
    });
    expect(taskManager.runSoon).toHaveBeenCalledWith(taskId);
    expect(res.ok).toHaveBeenCalledWith({ body: {} });
  });

  it('does not fail the request if `runSoon` rejects', async () => {
    taskManager.get.mockResolvedValue(
      taskManagerMock.createTask({ id: 'task-1', state: { status: 'in_progress' } })
    );
    taskManager.runSoon.mockRejectedValue(new Error('task is not idle'));

    const { res } = await callHandler();

    expect(res.ok).toHaveBeenCalledWith({ body: {} });
  });

  it('reports a server error, and does not call `runSoon`, if `bulkUpdateState` failed to persist the flag', async () => {
    // e.g. a persistent version conflict after task manager's own internal retries.
    taskManager.get.mockResolvedValue(
      taskManagerMock.createTask({ id: 'task-1', state: { status: 'in_progress' } })
    );
    taskManager.bulkUpdateState.mockResolvedValue({
      tasks: [],
      errors: [
        {
          id: 'task-1',
          type: 'task',
          error: { error: 'Conflict', message: 'Conflict', statusCode: 409 },
        },
      ],
    });

    const { res } = await callHandler();

    expect(res.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: 'Failed to cancel the merge job: Conflict',
    });
    expect(taskManager.runSoon).not.toHaveBeenCalled();
  });
});
