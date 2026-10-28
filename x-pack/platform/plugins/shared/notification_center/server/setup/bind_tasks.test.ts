/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Container } from 'inversify';
import { KibanaContainerModule, Logger, PluginSetup, PluginStart } from '@kbn/core-di';
import { setup, start } from '@kbn/core-di-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { TaskCost } from '@kbn/task-manager-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { CLEANUP_TASK_ID, CLEANUP_TASK_TYPE } from '../cleanup_task/cleanup_task';
import { NotificationCleanupService } from '../cleanup_task/cleanup_expired_notifications';
import { bindTasks } from './bind_tasks';

const createContainer = () => {
  const container = new Container();
  const registerTaskDefinitions = jest.fn();
  const ensureScheduled = jest.fn().mockResolvedValue({});
  const logger = loggingSystemMock.createLogger();
  const cleanup = { run: jest.fn().mockResolvedValue(undefined) };

  container
    .bind(PluginSetup<Pick<TaskManagerSetupContract, 'registerTaskDefinitions'>>('taskManager'))
    .toConstantValue({ registerTaskDefinitions });
  container
    .bind(PluginStart<Pick<TaskManagerStartContract, 'ensureScheduled'>>('taskManager'))
    .toConstantValue({ ensureScheduled });
  container.bind(Logger).toConstantValue(logger);
  container.bind(NotificationCleanupService).toConstantValue(cleanup as never);
  container.load(new KibanaContainerModule(bindTasks));

  return { container, registerTaskDefinitions, ensureScheduled, logger, cleanup };
};

const taskDefinition = (registerTaskDefinitions: jest.Mock) =>
  registerTaskDefinitions.mock.calls[0][0][CLEANUP_TASK_TYPE];

describe('bindTasks', () => {
  it('registers the cleanup task on setup with its type, title, cost, and timeout', () => {
    const { container, registerTaskDefinitions } = createContainer();

    setup(container);

    expect(registerTaskDefinitions).toHaveBeenCalledWith({
      [CLEANUP_TASK_TYPE]: expect.objectContaining({
        title: 'Notification Center retention cleanup',
        cost: TaskCost.Normal,
        timeout: '10m',
      }),
    });
  });

  it('schedules the task daily on start', async () => {
    const { container, ensureScheduled } = createContainer();

    start(container);

    expect(ensureScheduled).toHaveBeenCalledWith({
      id: CLEANUP_TASK_ID,
      taskType: CLEANUP_TASK_TYPE,
      schedule: { interval: '1d' },
      state: {},
      params: {},
    });
  });

  it('logs a scheduling failure instead of rejecting', async () => {
    const { container, ensureScheduled, logger } = createContainer();
    ensureScheduled.mockRejectedValue(new Error('task manager unavailable'));

    start(container);
    await new Promise(process.nextTick);

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('task manager unavailable'));
  });

  it('resolves the cleanup service only when the task runs, after start', async () => {
    const { container, registerTaskDefinitions, cleanup } = createContainer();
    setup(container);

    const { signal } = new AbortController();
    const runner = taskDefinition(registerTaskDefinitions).createTaskRunner({ signal });
    // `inject` holds the resolution until the plugin has started.
    expect(cleanup.run).not.toHaveBeenCalled();

    start(container);
    await runner.run();

    expect(cleanup.run).toHaveBeenCalledWith(signal);
  });
});
