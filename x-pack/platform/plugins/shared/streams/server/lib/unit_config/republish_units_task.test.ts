/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { TaskCost } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { StatusError } from '../streams/errors/status_error';
import {
  REPUBLISH_UNITS_TASK_ID,
  REPUBLISH_UNITS_TASK_TYPE,
  registerRepublishUnitsTask,
  runRepublishUnits,
  scheduleRepublishUnitsTask,
  type UnitRepublisher,
} from './republish_units_task';

const createRepublisher = (ids: string[] = ['default']): jest.Mocked<UnitRepublisher> => ({
  listUnitIds: jest.fn().mockResolvedValue(ids),
  republishUnit: jest.fn().mockResolvedValue('republished'),
});

describe('runRepublishUnits', () => {
  it('republishes every stored unit', async () => {
    const republisher = createRepublisher(['default', 'unit-2']);

    await runRepublishUnits({
      republisher,
      logger: loggerMock.create(),
      signal: new AbortController().signal,
    });

    expect(republisher.republishUnit.mock.calls).toEqual([
      ['default', expect.any(AbortSignal)],
      ['unit-2', expect.any(AbortSignal)],
    ]);
  });

  it('keeps going after a unit fails and logs a warning', async () => {
    const republisher = createRepublisher(['default', 'unit-2']);
    republisher.republishUnit.mockRejectedValueOnce(
      new StatusError('Cannot seal Streams unit credentials: cannot read current-kid (ENOENT)', 503)
    );
    const logger = loggerMock.create();

    await runRepublishUnits({ republisher, logger, signal: new AbortController().signal });

    expect(republisher.republishUnit).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('[default]'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cannot read current-kid'));
  });

  it('logs a re-seal at info', async () => {
    const republisher = createRepublisher();
    republisher.republishUnit.mockResolvedValueOnce('resealed');
    const logger = loggerMock.create();

    await runRepublishUnits({ republisher, logger, signal: new AbortController().signal });

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('[default]'));
  });

  it('stops before the next unit once the run is aborted', async () => {
    const republisher = createRepublisher(['default', 'unit-2']);
    const abortController = new AbortController();
    republisher.republishUnit.mockImplementationOnce(async () => {
      abortController.abort();
      return 'republished';
    });

    await runRepublishUnits({
      republisher,
      logger: loggerMock.create(),
      signal: abortController.signal,
    });

    expect(republisher.republishUnit).toHaveBeenCalledTimes(1);
  });

  it('passes the run signal to each unit and logs an aborted unit at debug', async () => {
    const republisher = createRepublisher();
    republisher.republishUnit.mockResolvedValueOnce('aborted');
    const { signal } = new AbortController();
    const logger = loggerMock.create();

    await runRepublishUnits({ republisher, logger, signal });

    expect(republisher.republishUnit).toHaveBeenCalledWith('default', signal);
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('aborted'));
    expect(logger.warn).not.toHaveBeenCalled();
  });
});

describe('registerRepublishUnitsTask', () => {
  const register = (republisher: UnitRepublisher) => {
    const taskManager = taskManagerMock.createSetup();
    const logger = loggerMock.create();
    const stopController = new AbortController();
    registerRepublishUnitsTask({
      taskManager,
      logger,
      getRepublisher: async () => republisher,
      stopSignal: stopController.signal,
    });
    const definition =
      taskManager.registerTaskDefinitions.mock.calls[0][0][REPUBLISH_UNITS_TASK_TYPE];
    const runTask = (signal = new AbortController().signal) =>
      definition.createTaskRunner({ taskInstance: {}, signal } as unknown as RunContext).run();
    return { definition, logger, runTask, stopController };
  };

  it('registers the task with an explicit timeout and cost', () => {
    const { definition } = register(createRepublisher());

    expect(definition).toMatchObject({ timeout: '2m', cost: TaskCost.Normal });
  });

  it('republishes stored units and returns empty state', async () => {
    const republisher = createRepublisher();
    const { runTask } = register(republisher);

    await expect(runTask()).resolves.toEqual({ state: {} });
    expect(republisher.republishUnit).toHaveBeenCalledWith('default', expect.any(AbortSignal));
  });

  it.each(['task timeout', 'plugin stop'])('aborts the unit signal on %s', async (source) => {
    const republisher = createRepublisher();
    const { runTask, stopController } = register(republisher);
    const runController = new AbortController();
    const states: boolean[] = [];
    republisher.republishUnit.mockImplementationOnce(async (_, unitSignal) => {
      states.push(unitSignal.aborted);
      (source === 'task timeout' ? runController : stopController).abort();
      states.push(unitSignal.aborted);
      return 'aborted';
    });

    await runTask(runController.signal);

    expect(states).toEqual([false, true]);
  });

  it('removes its listener from the plugin stop signal after a run', async () => {
    const { runTask, stopController } = register(createRepublisher());
    const removeEventListener = jest.spyOn(stopController.signal, 'removeEventListener');

    await runTask();

    expect(removeEventListener).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('logs and returns empty state instead of throwing when listing fails', async () => {
    const republisher = createRepublisher();
    republisher.listUnitIds.mockRejectedValue(new Error('es down'));
    const { logger, runTask } = register(republisher);

    await expect(runTask()).resolves.toEqual({ state: {} });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('es down'));
  });
});

describe('scheduleRepublishUnitsTask', () => {
  it('ensures the recurring task and asks for an immediate run', async () => {
    const taskManager = taskManagerMock.createStart();

    await scheduleRepublishUnitsTask({ taskManager, logger: loggerMock.create() });

    expect(taskManager.ensureScheduled).toHaveBeenCalledWith({
      id: REPUBLISH_UNITS_TASK_ID,
      taskType: REPUBLISH_UNITS_TASK_TYPE,
      schedule: { interval: '30m' },
      params: {},
      state: {},
    });
    expect(taskManager.runSoon).toHaveBeenCalledWith(REPUBLISH_UNITS_TASK_ID);
  });

  it('logs at debug when the immediate run is refused', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.runSoon.mockRejectedValue(new Error('task is already running'));
    const logger = loggerMock.create();

    await scheduleRepublishUnitsTask({ taskManager, logger });

    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('already running'));
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs an error and skips the immediate run when scheduling fails', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.ensureScheduled.mockRejectedValue(new Error('no task store'));
    const logger = loggerMock.create();

    await scheduleRepublishUnitsTask({ taskManager, logger });

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('no task store'));
    expect(taskManager.runSoon).not.toHaveBeenCalled();
  });
});
