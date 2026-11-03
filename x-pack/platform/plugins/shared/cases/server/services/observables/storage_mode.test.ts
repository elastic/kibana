/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { CASES_OBSERVABLES_SYNC_TASK_ID } from '../../tasks/observables_sync/constants';
import type { ObservablesReadSource } from './storage_mode';
import {
  ObservablesStorageMode,
  OBSERVABLES_STORAGE_MODE_REFRESH_INTERVAL_MS,
} from './storage_mode';

const PASS_VERSION = 2;

const taskWithState = (state: Record<string, unknown>) => ({ state } as ConcreteTaskInstance);

describe('ObservablesStorageMode', () => {
  let get: jest.MockedFunction<TaskManagerStartContract['get']>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  const createMode = ({
    configuredReadSource = 'index',
    withTaskManager = true,
  }: { configuredReadSource?: ObservablesReadSource; withTaskManager?: boolean } = {}) =>
    new ObservablesStorageMode({
      taskManager: withTaskManager ? { get } : undefined,
      configuredReadSource,
      logger,
      passVersion: PASS_VERSION,
    });

  beforeEach(() => {
    jest.useFakeTimers();
    get = jest.fn();
    logger = loggingSystemMock.createLogger();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('before the gating pass completed', () => {
    it('starts with the case field as the source of truth, before anything was read', () => {
      const mode = createMode();

      expect(mode.isIndexFirst()).toBe(false);
      expect(mode.getReadSource()).toBe('case');
    });

    it('stays case-first when no pass has completed', async () => {
      get.mockResolvedValue(taskWithState({}));
      const mode = createMode();

      await mode.start();

      expect(get).toHaveBeenCalledWith(CASES_OBSERVABLES_SYNC_TASK_ID);
      expect(mode.isIndexFirst()).toBe(false);
      expect(mode.getReadSource()).toBe('case');
      mode.stop();
    });

    it('stays case-first when only the pass of an earlier release completed', async () => {
      get.mockResolvedValue(taskWithState({ completedPassVersion: PASS_VERSION - 1 }));
      const mode = createMode();

      await mode.start();

      expect(mode.isIndexFirst()).toBe(false);
      expect(mode.getReadSource()).toBe('case');
      mode.stop();
    });

    it('stays case-first and never reads when Task Manager is disabled', async () => {
      const mode = createMode({ withTaskManager: false });

      await mode.start();
      jest.advanceTimersByTime(OBSERVABLES_STORAGE_MODE_REFRESH_INTERVAL_MS * 3);

      expect(get).not.toHaveBeenCalled();
      expect(mode.isIndexFirst()).toBe(false);
    });
  });

  describe('once the gating pass completed', () => {
    it('moves to index-first when the pass of this release completed', async () => {
      get.mockResolvedValue(taskWithState({ completedPassVersion: PASS_VERSION }));
      const mode = createMode();

      await mode.start();

      expect(mode.isIndexFirst()).toBe(true);
      expect(mode.getReadSource()).toBe('index');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('index is complete'));
    });

    it('moves to index-first when a later release completed a higher pass', async () => {
      get.mockResolvedValue(taskWithState({ completedPassVersion: PASS_VERSION + 1 }));
      const mode = createMode();

      await mode.start();

      expect(mode.isIndexFirst()).toBe(true);
    });

    it('keeps reading the case field when the setting says so, without leaving index-first', async () => {
      get.mockResolvedValue(taskWithState({ completedPassVersion: PASS_VERSION }));
      const mode = createMode({ configuredReadSource: 'case' });

      await mode.start();

      expect(mode.isIndexFirst()).toBe(true);
      expect(mode.getReadSource()).toBe('case');
    });

    it('never moves back, even when the completion record disappears', async () => {
      get.mockResolvedValueOnce(taskWithState({ completedPassVersion: PASS_VERSION }));
      const mode = createMode();
      await mode.start();

      get.mockResolvedValue(taskWithState({}));
      await mode.refresh();
      jest.advanceTimersByTime(OBSERVABLES_STORAGE_MODE_REFRESH_INTERVAL_MS * 3);

      expect(mode.isIndexFirst()).toBe(true);
      expect(get).toHaveBeenCalledTimes(1);
    });
  });

  describe('noticing a pass that completes later', () => {
    it('looks again once a minute and switches when another node completes the pass', async () => {
      get.mockResolvedValue(taskWithState({ completedPassVersion: PASS_VERSION - 1 }));
      const mode = createMode();
      await mode.start();
      expect(mode.isIndexFirst()).toBe(false);

      get.mockResolvedValue(taskWithState({ completedPassVersion: PASS_VERSION }));
      await jest.advanceTimersByTimeAsync(OBSERVABLES_STORAGE_MODE_REFRESH_INTERVAL_MS);

      expect(get).toHaveBeenCalledTimes(2);
      expect(mode.isIndexFirst()).toBe(true);
    });

    it('stops looking after the switch', async () => {
      get.mockResolvedValue(taskWithState({ completedPassVersion: PASS_VERSION }));
      const mode = createMode();
      await mode.start();

      await jest.advanceTimersByTimeAsync(OBSERVABLES_STORAGE_MODE_REFRESH_INTERVAL_MS * 5);

      expect(get).toHaveBeenCalledTimes(1);
    });

    it('stops looking when stopped', async () => {
      get.mockResolvedValue(taskWithState({}));
      const mode = createMode();
      await mode.start();

      mode.stop();
      await jest.advanceTimersByTimeAsync(OBSERVABLES_STORAGE_MODE_REFRESH_INTERVAL_MS * 5);

      expect(get).toHaveBeenCalledTimes(1);
    });

    it('does not start a second lookup while one is still running', async () => {
      let resolveGet: (task: ConcreteTaskInstance) => void = () => {};
      get.mockReturnValue(
        new Promise<ConcreteTaskInstance>((resolve) => {
          resolveGet = resolve;
        })
      );
      const mode = createMode();

      const first = mode.refresh();
      const second = mode.refresh();
      resolveGet(taskWithState({}));
      await Promise.all([first, second]);

      expect(get).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the completion record cannot be read', () => {
    it('stays case-first and logs the error when the lookup fails', async () => {
      // Failure scenario: Elasticsearch is unreachable while the node starts.
      get.mockRejectedValue(new Error('es down'));
      const mode = createMode();

      await mode.start();

      expect(mode.isIndexFirst()).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('es down'));
      mode.stop();
    });

    it('tries again at the next interval after a failed lookup', async () => {
      get.mockRejectedValueOnce(new Error('es down'));
      get.mockResolvedValue(taskWithState({ completedPassVersion: PASS_VERSION }));
      const mode = createMode();
      await mode.start();

      await jest.advanceTimersByTimeAsync(OBSERVABLES_STORAGE_MODE_REFRESH_INTERVAL_MS);

      expect(mode.isIndexFirst()).toBe(true);
    });

    it('stays case-first quietly when the task does not exist yet', async () => {
      // Failure scenario: the node reads before the sync task was created on a fresh cluster.
      get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError('task', CASES_OBSERVABLES_SYNC_TASK_ID)
      );
      const mode = createMode();

      await mode.start();

      expect(mode.isIndexFirst()).toBe(false);
      expect(logger.warn).not.toHaveBeenCalled();
      mode.stop();
    });
  });
});
