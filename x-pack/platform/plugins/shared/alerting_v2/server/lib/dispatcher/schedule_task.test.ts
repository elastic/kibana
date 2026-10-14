/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { INTERVAL, scheduleDispatcherTask } from './schedule_task';
import { DISPATCHER_TASK_ID, DISPATCHER_TASK_TYPE } from './constants';

describe('scheduleDispatcherTask', () => {
  let taskManager: jest.Mocked<Pick<TaskManagerStartContract, 'ensureScheduled'>>;

  beforeEach(() => {
    taskManager = {
      ensureScheduled: jest.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('schedules the dispatcher task', async () => {
    await scheduleDispatcherTask({
      taskManager: taskManager as unknown as TaskManagerStartContract,
    });

    expect(taskManager.ensureScheduled).toHaveBeenCalledTimes(1);
  });

  it('passes the correct task configuration to ensureScheduled', async () => {
    await scheduleDispatcherTask({
      taskManager: taskManager as unknown as TaskManagerStartContract,
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
