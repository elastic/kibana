/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { createMockResourceManager } from '../services/resource_service/resource_manager.mock';
import { INTERVAL, scheduleDispatcherTask } from './schedule_task';
import { DISPATCHER_TASK_ID, DISPATCHER_TASK_TYPE } from './task_definition';

describe('scheduleDispatcherTask', () => {
  let taskManager: jest.Mocked<Pick<TaskManagerStartContract, 'ensureScheduled'>>;
  let resourceManager: ReturnType<typeof createMockResourceManager>;
  let callOrder: string[];

  beforeEach(() => {
    callOrder = [];

    resourceManager = createMockResourceManager();
    resourceManager.waitUntilReady.mockImplementation(() => {
      callOrder.push('waitUntilReady');
      return Promise.resolve();
    });

    taskManager = {
      ensureScheduled: jest.fn().mockImplementation(() => {
        callOrder.push('ensureScheduled');
        return Promise.resolve();
      }),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('waits for resources before scheduling the task', async () => {
    await scheduleDispatcherTask({
      taskManager: taskManager as unknown as TaskManagerStartContract,
      resourceManager,
    });

    expect(callOrder).toEqual(['waitUntilReady', 'ensureScheduled']);
  });

  it('does not schedule when resources fail to initialize', async () => {
    const error = new Error('resource init failed');
    resourceManager.waitUntilReady.mockRejectedValue(error);

    await expect(
      scheduleDispatcherTask({
        taskManager: taskManager as unknown as TaskManagerStartContract,
        resourceManager,
      })
    ).rejects.toThrow(error);

    expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
  });

  it('passes the correct task configuration to ensureScheduled', async () => {
    await scheduleDispatcherTask({
      taskManager: taskManager as unknown as TaskManagerStartContract,
      resourceManager,
    });

    expect(taskManager.ensureScheduled).toHaveBeenCalledWith({
      id: DISPATCHER_TASK_ID,
      taskType: DISPATCHER_TASK_TYPE,
      schedule: {
        interval: INTERVAL,
      },
      scope: ['alerting'],
      state: {},
      params: {},
      enabled: true,
    });
  });
});
