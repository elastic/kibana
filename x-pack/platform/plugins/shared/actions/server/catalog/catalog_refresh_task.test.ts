/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { loggerMock } from '@kbn/logging-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { TaskCost } from '@kbn/task-manager-plugin/server';
import type { CatalogService } from './catalog_service';
import {
  CATALOG_REFRESH_TASK_ID,
  CATALOG_REFRESH_TASK_TIMEOUT,
  CATALOG_REFRESH_TASK_TYPE,
  registerCatalogRefreshTask,
  scheduleCatalogRefreshTask,
} from './catalog_refresh_task';

const createRunner = (
  getService: () => CatalogService | undefined,
  signal: AbortSignal = new AbortController().signal
) => {
  const taskManager = taskManagerMock.createSetup();
  registerCatalogRefreshTask(taskManager, getService);
  const definition = taskManager.registerTaskDefinitions.mock.calls[0][0][CATALOG_REFRESH_TASK_TYPE];
  return {
    taskManager,
    definition,
    runner: definition.createTaskRunner({ signal } as RunContext),
  };
};

describe('catalog refresh task', () => {
  it('registers a stateless definition with an explicit timeout', () => {
    const { definition } = createRunner(() => undefined);

    expect(definition).toEqual(
      expect.objectContaining({
        title: 'Connector catalog refresh',
        timeout: CATALOG_REFRESH_TASK_TIMEOUT,
        cost: TaskCost.Normal,
      })
    );
    expect(definition.paramsSchema).toBeUndefined();
    expect(CATALOG_REFRESH_TASK_TYPE).toBe('actions:catalog_refresh');
    expect(CATALOG_REFRESH_TASK_ID).toBe('actions-catalog_refresh');
    expect(CATALOG_REFRESH_TASK_TIMEOUT).toBe('2m');
  });

  it('calls refresh with the task signal', async () => {
    const controller = new AbortController();
    const service = {
      refresh: jest.fn().mockResolvedValue(undefined),
    } as unknown as CatalogService;
    const { runner } = createRunner(() => service, controller.signal);

    await expect(runner.run()).resolves.toEqual({ state: {} });
    expect(service.refresh).toHaveBeenCalledTimes(1);
    expect(service.refresh).toHaveBeenCalledWith({ signal: controller.signal });
  });

  it('returns empty state without refresh when the signal is aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const service = {
      refresh: jest.fn().mockResolvedValue(undefined),
    } as unknown as CatalogService;
    const { runner } = createRunner(() => service, controller.signal);

    await expect(runner.run()).resolves.toEqual({ state: {} });
    expect(service.refresh).not.toHaveBeenCalled();
  });

  it('returns empty state without refresh when the service is missing', async () => {
    const { runner } = createRunner(() => undefined);

    await expect(runner.run()).resolves.toEqual({ state: {} });
  });

  it('schedules a 5 minute interval as 300s', async () => {
    const taskManager = taskManagerMock.createStart();
    await scheduleCatalogRefreshTask(taskManager, moment.duration(5, 'minutes'), loggerMock.create());

    expect(taskManager.ensureScheduled).toHaveBeenCalledWith({
      id: CATALOG_REFRESH_TASK_ID,
      taskType: CATALOG_REFRESH_TASK_TYPE,
      params: {},
      state: {},
      schedule: { interval: '300s' },
    });
  });

  it('logs ensureScheduled rejections instead of throwing', async () => {
    const taskManager = taskManagerMock.createStart();
    const logger = loggerMock.create();
    taskManager.ensureScheduled.mockRejectedValue(new Error('schedule failed'));

    await expect(
      scheduleCatalogRefreshTask(taskManager, moment.duration(5, 'minutes'), logger)
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('schedule failed'));
  });
});
