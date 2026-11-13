/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { RunContext } from '@kbn/task-manager-plugin/server/task';
import {
  isRetryableError,
  isUnrecoverableError,
} from '@kbn/task-manager-plugin/server/task_running/errors';
import {
  LATEST_INDEX_MAPPINGS_MIGRATION_TASK_ID,
  registerLatestIndexMappingsMigrationTask,
  runLatestIndexMappingsMigration,
  scheduleLatestIndexMappingsMigration,
} from './latest_index_mappings_migration_task';
import { migrateLatestIndexMappings } from '../domain/asset_manager/migrate_latest_index_mappings';
import type { EntityStoreCoreSetup } from '../types';

jest.mock('../domain/asset_manager/migrate_latest_index_mappings');

const getRejection = async (promise: Promise<unknown>): Promise<Error> => {
  try {
    await promise;
  } catch (error) {
    return error as Error;
  }
  throw new Error('Expected the promise to reject');
};

const mockMigrateLatestIndexMappings = migrateLatestIndexMappings as jest.MockedFunction<
  typeof migrateLatestIndexMappings
>;

describe('latest_index_mappings_migration_task', () => {
  const logger = loggerMock.create();
  let mockEsClient: ElasticsearchClient;
  let mockFind: jest.Mock;
  let coreStart: CoreStart;
  let taskManager: jest.Mocked<Pick<TaskManagerStartContract, 'ensureScheduled'>>;

  const givenNamespaces = (...namespaces: string[]) => {
    mockFind.mockResolvedValue({
      saved_objects: namespaces.map((namespace) => ({ namespaces: [namespace] })),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    logger.get.mockReturnValue(logger);
    mockEsClient = {} as ElasticsearchClient;
    mockFind = jest.fn();
    mockMigrateLatestIndexMappings.mockResolvedValue('up_to_date');

    coreStart = {
      elasticsearch: { client: { asInternalUser: mockEsClient } },
      savedObjects: {
        createInternalRepository: jest.fn().mockReturnValue({ find: mockFind }),
      },
    } as unknown as CoreStart;

    taskManager = { ensureScheduled: jest.fn().mockResolvedValue(undefined) };
  });

  describe('runLatestIndexMappingsMigration', () => {
    it('migrates every installed namespace as the internal user', async () => {
      givenNamespaces('default', 'other');
      mockMigrateLatestIndexMappings.mockResolvedValueOnce('migrated');

      const result = await runLatestIndexMappingsMigration({
        coreStart,
        logger,
        signal: new AbortController().signal,
      });

      expect(result).toEqual({ default: 'migrated', other: 'up_to_date' });
      expect(mockMigrateLatestIndexMappings).toHaveBeenCalledTimes(2);
      expect(mockMigrateLatestIndexMappings).toHaveBeenNthCalledWith(1, {
        esClient: mockEsClient,
        logger: expect.anything(),
        namespace: 'default',
      });
      expect(mockMigrateLatestIndexMappings).toHaveBeenNthCalledWith(2, {
        esClient: mockEsClient,
        logger: expect.anything(),
        namespace: 'other',
      });
    });

    it('does not skip the next space when one space fails, then throws naming the failed space', async () => {
      givenNamespaces('first', 'broken', 'last');
      mockMigrateLatestIndexMappings.mockImplementation(async ({ namespace }) => {
        if (namespace === 'broken') {
          throw new Error('putMapping conflict');
        }
        return 'migrated';
      });

      const error = await getRejection(
        runLatestIndexMappingsMigration({
          coreStart,
          logger,
          signal: new AbortController().signal,
        })
      );

      expect(error.message).toBe('Latest index mappings migration failed in: broken');
      expect(isRetryableError(error)).toBe(true);

      expect(mockMigrateLatestIndexMappings.mock.calls.map(([{ namespace }]) => namespace)).toEqual(
        ['first', 'broken', 'last']
      );
    });

    it('names every failed space and logs each failure with its namespace', async () => {
      givenNamespaces('a', 'b', 'c');
      mockMigrateLatestIndexMappings.mockImplementation(async ({ namespace }) => {
        if (namespace !== 'b') {
          throw new Error(`boom ${namespace}`);
        }
        return 'migrated';
      });

      await expect(
        runLatestIndexMappingsMigration({
          coreStart,
          logger,
          signal: new AbortController().signal,
        })
      ).rejects.toThrow('Latest index mappings migration failed in: a, c');

      const errors = logger.error.mock.calls.map(([message]) => String(message));
      expect(errors).toHaveLength(2);
      expect(errors[0]).toContain('"a"');
      expect(errors[0]).toContain('boom a');
      expect(errors[1]).toContain('"c"');
      expect(errors[1]).toContain('boom c');
    });

    it('resolves without throwing when every space succeeds', async () => {
      givenNamespaces('default', 'other');
      mockMigrateLatestIndexMappings.mockResolvedValue('migrated');

      await expect(
        runLatestIndexMappingsMigration({
          coreStart,
          logger,
          signal: new AbortController().signal,
        })
      ).resolves.toEqual({ default: 'migrated', other: 'migrated' });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('does not treat a missing index as a failure', async () => {
      givenNamespaces('default', 'other');
      mockMigrateLatestIndexMappings
        .mockResolvedValueOnce('index_missing')
        .mockResolvedValueOnce('migrated');

      await expect(
        runLatestIndexMappingsMigration({
          coreStart,
          logger,
          signal: new AbortController().signal,
        })
      ).resolves.toEqual({ default: 'index_missing', other: 'migrated' });
    });

    it('logs at info when something migrated and at debug otherwise', async () => {
      givenNamespaces('default');
      mockMigrateLatestIndexMappings.mockResolvedValueOnce('migrated');
      await runLatestIndexMappingsMigration({
        coreStart,
        logger,
        signal: new AbortController().signal,
      });
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('default'));

      jest.clearAllMocks();
      logger.get.mockReturnValue(logger);
      mockMigrateLatestIndexMappings.mockResolvedValue('up_to_date');
      await runLatestIndexMappingsMigration({
        coreStart,
        logger,
        signal: new AbortController().signal,
      });
      expect(logger.info).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('default'));
    });

    it('throws a retryable abort before migrating when the task signal is aborted', async () => {
      givenNamespaces('default');
      const controller = new AbortController();
      controller.abort();

      const error = await getRejection(
        runLatestIndexMappingsMigration({ coreStart, logger, signal: controller.signal })
      );

      expect(error.message).toMatch(/aborted/i);
      expect(isRetryableError(error)).toBe(true);
      expect(mockMigrateLatestIndexMappings).not.toHaveBeenCalled();
    });

    it('stops with a retryable abort when the signal aborts between spaces', async () => {
      givenNamespaces('first', 'second');
      const controller = new AbortController();
      mockMigrateLatestIndexMappings.mockImplementationOnce(async () => {
        controller.abort();
        return 'migrated';
      });

      const error = await getRejection(
        runLatestIndexMappingsMigration({ coreStart, logger, signal: controller.signal })
      );

      expect(error.message).toMatch(/aborted/i);
      expect(isRetryableError(error)).toBe(true);
      expect(mockMigrateLatestIndexMappings).toHaveBeenCalledTimes(1);
    });
  });

  describe('registerLatestIndexMappingsMigrationTask', () => {
    const register = () => {
      const registerTaskDefinitions = jest.fn();
      const core = {
        getStartServices: jest.fn().mockResolvedValue([coreStart]),
      } as unknown as EntityStoreCoreSetup;
      registerLatestIndexMappingsMigrationTask({
        taskManager: { registerTaskDefinitions } as unknown as TaskManagerSetupContract,
        logger,
        core,
      });
      const [definitions] = registerTaskDefinitions.mock.calls[0];
      return definitions[LATEST_INDEX_MAPPINGS_MIGRATION_TASK_ID];
    };

    it('registers a task definition with the new type', () => {
      const definition = register();

      expect(LATEST_INDEX_MAPPINGS_MIGRATION_TASK_ID).toBe(
        'entity_store:v2:latest_index_mappings_migration'
      );
      expect(definition).toEqual(
        expect.objectContaining({
          title: 'Entity Store - Latest Index Mappings Migration',
          timeout: '10m',
          createTaskRunner: expect.any(Function),
        })
      );
    });

    it('runs the migration and returns an empty state', async () => {
      givenNamespaces('default');
      const runner = register().createTaskRunner({
        signal: new AbortController().signal,
      } as RunContext);

      await expect(runner.run()).resolves.toEqual({ state: {} });
      expect(mockMigrateLatestIndexMappings).toHaveBeenCalledTimes(1);
    });

    it('turns a failing space into a retryable task error', async () => {
      givenNamespaces('broken');
      mockMigrateLatestIndexMappings.mockRejectedValue(new Error('boom'));
      const runner = register().createTaskRunner({
        signal: new AbortController().signal,
      } as RunContext);

      const error = await getRejection(runner.run());

      expect(error.message).toBe('Latest index mappings migration failed in: broken');
      expect(isRetryableError(error)).toBe(true);
    });

    it('retries when listing the namespaces fails', async () => {
      mockFind.mockRejectedValue(new Error('so unavailable'));
      const runner = register().createTaskRunner({
        signal: new AbortController().signal,
      } as RunContext);

      const error = await getRejection(runner.run());

      expect(error.message).toBe('so unavailable');
      expect(isRetryableError(error)).toBe(true);
      expect(isUnrecoverableError(error)).toBe(false);
    });

    it('does not retry when the saved object type is not defined', async () => {
      mockFind.mockRejectedValue(new Error('Unsupported saved object type: not defined'));
      const runner = register().createTaskRunner({
        signal: new AbortController().signal,
      } as RunContext);

      const error = await getRejection(runner.run());

      expect(error.message).toBe('Unsupported saved object type: not defined');
      expect(isUnrecoverableError(error)).toBe(true);
    });
  });

  describe('scheduleLatestIndexMappingsMigration', () => {
    const schedule = () =>
      scheduleLatestIndexMappingsMigration({
        coreStart,
        taskManager: taskManager as unknown as TaskManagerStartContract,
        logger,
      });

    it('schedules the one-shot task with the stable id when namespaces exist', async () => {
      givenNamespaces('default');

      await schedule();

      expect(taskManager.ensureScheduled).toHaveBeenCalledTimes(1);
      expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          id: LATEST_INDEX_MAPPINGS_MIGRATION_TASK_ID,
          taskType: 'entity_store:v2:latest_index_mappings_migration',
          scheduledAt: expect.any(Date),
          runAt: expect.any(Date),
          params: {},
          state: {},
        })
      );
    });

    it('does not schedule when no entity store namespaces exist', async () => {
      givenNamespaces();

      await schedule();

      expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalled();
    });

    it('swallows and logs a namespace listing error', async () => {
      mockFind.mockRejectedValue(new Error('so unavailable'));

      await expect(schedule()).resolves.toBeUndefined();

      expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('so unavailable'));
    });

    it('swallows and logs a scheduling error', async () => {
      givenNamespaces('default');
      taskManager.ensureScheduled.mockRejectedValue(new Error('tm down'));

      await expect(schedule()).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('tm down'));
    });
  });
});
