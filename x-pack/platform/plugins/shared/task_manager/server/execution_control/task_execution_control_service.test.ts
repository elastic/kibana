/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import { skip, take, toArray } from 'rxjs';
import { savedObjectsRepositoryMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SavedObject } from '@kbn/core/server';
import { TaskExecutionControlService } from './task_execution_control_service';
import { TASK_EXECUTION_CONTROL_SO_ID } from '../constants';
import { TASK_EXECUTION_CONTROL_SO_NAME } from '../saved_objects';
import type { TaskExecutionControl } from '../saved_objects/schemas/task_execution_control';
import { DEFAULT_EXECUTION_CONTROL_POLL_INTERVAL_MS } from '../config';

const POLL_INTERVAL = DEFAULT_EXECUTION_CONTROL_POLL_INTERVAL_MS;

const soResult = (
  attributes: TaskExecutionControl,
  version = 'v1'
): SavedObject<TaskExecutionControl> => ({
  id: TASK_EXECUTION_CONTROL_SO_ID,
  type: TASK_EXECUTION_CONTROL_SO_NAME,
  references: [],
  attributes,
  version,
});

const notFound = () =>
  SavedObjectsErrorHelpers.createGenericNotFoundError(
    TASK_EXECUTION_CONTROL_SO_NAME,
    TASK_EXECUTION_CONTROL_SO_ID
  );

describe('TaskExecutionControlService', () => {
  let savedObjectsRepository: ReturnType<typeof savedObjectsRepositoryMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  const createService = () =>
    new TaskExecutionControlService({
      savedObjectsRepository,
      logger,
      config: { poll_interval: POLL_INTERVAL },
    });

  beforeEach(() => {
    jest.useFakeTimers();
    savedObjectsRepository = savedObjectsRepositoryMock.create();
    logger = loggingSystemMock.createLogger();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('start / read state', () => {
    it('defaults to unpaused when the document does not exist', async () => {
      savedObjectsRepository.get.mockRejectedValue(notFound());
      const service = createService();
      await service.start();

      expect(service.getState()).toEqual({ paused: false, pausedTaskTypes: [] });
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('is not initialized until the first read settles', async () => {
      savedObjectsRepository.get.mockResolvedValue(
        soResult({ paused: true, paused_task_types: [], updated_at: 'a' })
      );
      const service = createService();
      expect(service.isInitialized()).toBe(false);

      await service.start();

      expect(service.isInitialized()).toBe(true);
    });

    it('applies the persisted paused state on startup', async () => {
      savedObjectsRepository.get.mockResolvedValue(
        soResult({
          paused: true,
          paused_task_types: ['alerting:foo'],
          updated_at: '2024-01-01T00:00:00.000Z',
        })
      );
      const service = createService();
      await service.start();

      expect(service.getState()).toEqual({ paused: true, pausedTaskTypes: ['alerting:foo'] });
    });

    it('fails open with a warning when the initial read never succeeds', async () => {
      savedObjectsRepository.get.mockRejectedValue(new Error('es down'));
      const service = createService();
      const startPromise = service.start();
      // Advance through the bounded retry delays.
      await jest.runOnlyPendingTimersAsync();
      await jest.runOnlyPendingTimersAsync();
      await startPromise;

      expect(service.getState()).toEqual({ paused: false, pausedTaskTypes: [] });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('could not be read on startup')
      );
    });
  });

  describe('polling', () => {
    it('emits only when the state changes', async () => {
      savedObjectsRepository.get
        .mockResolvedValueOnce(soResult({ paused: false, paused_task_types: [], updated_at: 'a' }))
        .mockResolvedValueOnce(soResult({ paused: false, paused_task_types: [], updated_at: 'b' }))
        .mockResolvedValueOnce(soResult({ paused: true, paused_task_types: [], updated_at: 'c' }));

      const service = createService();
      // Collect the two states after the initial one: unchanged poll (no emit), then paused.
      const emissions = firstValueFrom(service.state.pipe(skip(1), take(1), toArray()));
      await service.start();

      await jest.advanceTimersByTimeAsync(POLL_INTERVAL); // unchanged, no emit
      await jest.advanceTimersByTimeAsync(POLL_INTERVAL); // paused, emits

      await expect(emissions).resolves.toEqual([{ paused: true, pausedTaskTypes: [] }]);
    });

    it('keeps the last-known state when a poll read fails', async () => {
      savedObjectsRepository.get
        .mockResolvedValueOnce(soResult({ paused: true, paused_task_types: [], updated_at: 'a' }))
        .mockRejectedValueOnce(new Error('transient'));

      const service = createService();
      await service.start();
      expect(service.getState().paused).toBe(true);

      await jest.advanceTimersByTimeAsync(POLL_INTERVAL);

      expect(service.getState().paused).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('could not be refreshed'));
    });

    it('stops polling after stop()', async () => {
      savedObjectsRepository.get.mockResolvedValue(
        soResult({ paused: false, paused_task_types: [], updated_at: 'a' })
      );
      const service = createService();
      await service.start();
      const callsAfterStart = savedObjectsRepository.get.mock.calls.length;

      service.stop();
      await jest.advanceTimersByTimeAsync(POLL_INTERVAL * 3);

      expect(savedObjectsRepository.get).toHaveBeenCalledTimes(callsAfterStart);
    });
  });

  describe('update', () => {
    it('creates the document on first write', async () => {
      savedObjectsRepository.get.mockRejectedValue(notFound());
      savedObjectsRepository.create.mockResolvedValue(
        soResult({ paused: true, paused_task_types: [], updated_at: 'x' })
      );
      const service = createService();

      const result = await service.update(() => ({ paused: true, pausedTaskTypes: [] }), {
        username: 'operator',
      });

      expect(savedObjectsRepository.create).toHaveBeenCalledWith(
        TASK_EXECUTION_CONTROL_SO_NAME,
        expect.objectContaining({ paused: true, updated_by: 'operator' }),
        expect.objectContaining({ id: TASK_EXECUTION_CONTROL_SO_ID, overwrite: false })
      );
      expect(result.paused).toBe(true);
      expect(service.getState().paused).toBe(true);
    });

    it('updates the document with the current version when it exists', async () => {
      savedObjectsRepository.get.mockResolvedValue(
        soResult({ paused: false, paused_task_types: ['a'], updated_at: 'x' }, 'v7')
      );
      savedObjectsRepository.update.mockResolvedValue(soResult({} as TaskExecutionControl));
      const service = createService();

      await service.update((current) => ({
        paused: current.paused,
        pausedTaskTypes: [...current.pausedTaskTypes, 'b'],
      }));

      expect(savedObjectsRepository.update).toHaveBeenCalledWith(
        TASK_EXECUTION_CONTROL_SO_NAME,
        TASK_EXECUTION_CONTROL_SO_ID,
        expect.objectContaining({ paused_task_types: ['a', 'b'] }),
        expect.objectContaining({ version: 'v7', refresh: 'wait_for' })
      );
    });

    it('retries the read-modify-write on a version conflict', async () => {
      savedObjectsRepository.get
        .mockResolvedValueOnce(
          soResult({ paused: false, paused_task_types: [], updated_at: 'x' }, 'v1')
        )
        .mockResolvedValueOnce(
          soResult({ paused: false, paused_task_types: [], updated_at: 'y' }, 'v2')
        );
      savedObjectsRepository.update
        .mockRejectedValueOnce(
          SavedObjectsErrorHelpers.createConflictError(
            TASK_EXECUTION_CONTROL_SO_NAME,
            TASK_EXECUTION_CONTROL_SO_ID
          )
        )
        .mockResolvedValueOnce(soResult({} as TaskExecutionControl));
      const service = createService();

      await service.update(() => ({ paused: true, pausedTaskTypes: [] }));

      expect(savedObjectsRepository.update).toHaveBeenCalledTimes(2);
      expect(savedObjectsRepository.update).toHaveBeenLastCalledWith(
        TASK_EXECUTION_CONTROL_SO_NAME,
        TASK_EXECUTION_CONTROL_SO_ID,
        expect.anything(),
        expect.objectContaining({ version: 'v2' })
      );
    });

    it('deduplicates paused task types', async () => {
      savedObjectsRepository.get.mockRejectedValue(notFound());
      savedObjectsRepository.create.mockResolvedValue(soResult({} as TaskExecutionControl));
      const service = createService();

      await service.update(() => ({ paused: false, pausedTaskTypes: ['a', 'a', 'b'] }));

      expect(savedObjectsRepository.create).toHaveBeenCalledWith(
        TASK_EXECUTION_CONTROL_SO_NAME,
        expect.objectContaining({ paused_task_types: ['a', 'b'] }),
        expect.anything()
      );
    });
  });
});
