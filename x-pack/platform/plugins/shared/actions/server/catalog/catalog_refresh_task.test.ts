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
import type { DeclarativeCatalogService } from './catalog_service';
import {
  CATALOG_REFRESH_TASK_ID,
  CATALOG_REFRESH_TASK_TIMEOUT,
  CATALOG_REFRESH_TASK_TYPE,
  registerCatalogRefreshTask,
  scheduleCatalogRefreshTask,
} from './catalog_refresh_task';

describe('catalog refresh task', () => {
  it('registers the catalog refresh task definition', () => {
    const taskManager = taskManagerMock.createSetup();
    registerCatalogRefreshTask(taskManager, () => undefined);

    expect(taskManager.registerTaskDefinitions).toHaveBeenCalledWith({
      [CATALOG_REFRESH_TASK_TYPE]: expect.objectContaining({
        title: 'Connector catalog refresh',
        timeout: CATALOG_REFRESH_TASK_TIMEOUT,
      }),
    });
    expect(CATALOG_REFRESH_TASK_TYPE).toBe('actions:catalog_refresh');
    expect(CATALOG_REFRESH_TASK_ID).toBe('actions-catalog_refresh');
  });

  it('invokes refresh from the task runner', async () => {
    const taskManager = taskManagerMock.createSetup();
    const service = {
      refresh: jest.fn().mockResolvedValue(undefined),
    } as unknown as DeclarativeCatalogService;
    registerCatalogRefreshTask(taskManager, () => service);

    const definition =
      taskManager.registerTaskDefinitions.mock.calls[0][0][CATALOG_REFRESH_TASK_TYPE];
    const runner = definition.createTaskRunner({
      signal: new AbortController().signal,
    } as RunContext);

    await expect(runner.run()).resolves.toEqual({ state: {} });
    expect(service.refresh).toHaveBeenCalledTimes(1);
  });

  it('schedules the recurring refresh task from a duration', async () => {
    const taskManager = taskManagerMock.createStart();
    await scheduleCatalogRefreshTask(
      taskManager,
      moment.duration(60, 'seconds'),
      loggerMock.create()
    );

    expect(taskManager.ensureScheduled).toHaveBeenCalledWith({
      id: CATALOG_REFRESH_TASK_ID,
      taskType: CATALOG_REFRESH_TASK_TYPE,
      params: {},
      state: {},
      schedule: { interval: '60s' },
    });
  });
});
