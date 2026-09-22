/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { waitUntilTaskCompleted } from './utils';

describe('waitUntilTaskCompleted', () => {
  it('resolves once the task is no longer found', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('task', 'my-task')
    );

    await expect(
      waitUntilTaskCompleted({ taskManager, taskId: 'my-task', timeout: 50, interval: 1 })
    ).resolves.toBeUndefined();
    expect(taskManager.get).toHaveBeenCalledTimes(1);
  });

  it('keeps polling at the regular interval through transient read failures', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get
      .mockRejectedValueOnce(new Error('es unavailable'))
      .mockResolvedValueOnce({ status: 'failed' } as ConcreteTaskInstance);

    await expect(
      waitUntilTaskCompleted({ taskManager, taskId: 'my-task', timeout: 1_000, interval: 1 })
    ).resolves.toBeUndefined();
    expect(taskManager.get).toHaveBeenCalledTimes(2);
  });

  it('gives up after the timeout when status reads keep failing instead of polling hot', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockRejectedValue(new Error('es unavailable'));

    await expect(
      waitUntilTaskCompleted({ taskManager, taskId: 'my-task', timeout: 40, interval: 10 })
    ).rejects.toThrow('Timeout waiting for task my-task to complete.');
    expect(taskManager.get.mock.calls.length).toBeLessThanOrEqual(6);
  });
});
