/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { CoreStart, ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { TaskCost } from '@kbn/task-manager-plugin/server';
import type {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
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

const esResponseError = (statusCode: number): esErrors.ResponseError =>
  new esErrors.ResponseError({
    body: { error: { type: 'some_exception' } },
    statusCode,
    headers: {},
    warnings: [],
    meta: {},
  } as unknown as ConstructorParameters<typeof esErrors.ResponseError>[0]);

/** How the migration reports an Elasticsearch failure: wrapped, with the original as the cause. */
const wrappedMigrationError = (cause: Error): Error =>
  new Error('Failed to migrate latest index mappings', { cause });

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
    it('migrates every installed namespace as the internal user, passing the task signal', async () => {
      givenNamespaces('default', 'other');
      mockMigrateLatestIndexMappings.mockResolvedValueOnce('migrated');
      const { signal } = new AbortController();

      const result = await runLatestIndexMappingsMigration({ coreStart, logger, signal });

      expect(result).toEqual({ default: 'migrated', other: 'up_to_date' });
      expect(mockMigrateLatestIndexMappings).toHaveBeenCalledTimes(2);
      expect(mockMigrateLatestIndexMappings.mock.calls.map(([params]) => params.namespace)).toEqual(
        ['default', 'other']
      );
      for (const [params] of mockMigrateLatestIndexMappings.mock.calls) {
        expect(params.esClient).toBe(mockEsClient);
        // Identity, as a boolean: jest treats any two un-aborted AbortSignals as equal and
        // crashes when it tries to print a diff of one
        expect(params.signal === signal).toBe(true);
      }
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

    describe('permanent versus transient failures', () => {
      const runWithFailures = async (failures: Record<string, unknown>): Promise<Error> => {
        givenNamespaces(...Object.keys(failures));
        mockMigrateLatestIndexMappings.mockImplementation(async ({ namespace }) => {
          throw failures[namespace];
        });
        return getRejection(
          runLatestIndexMappingsMigration({
            coreStart,
            logger,
            signal: new AbortController().signal,
          })
        );
      };

      it.each([400, 401, 403])(
        'is unrecoverable when every failure is a permanent %i from Elasticsearch, and every space still ran',
        async (statusCode) => {
          const error = await runWithFailures({
            first: wrappedMigrationError(esResponseError(statusCode)),
            second: wrappedMigrationError(esResponseError(statusCode)),
          });

          expect(isUnrecoverableError(error)).toBe(true);
          expect(isRetryableError(error)).toBeFalsy();
          expect(error.message).toBe('Latest index mappings migration failed in: first, second');
          expect(mockMigrateLatestIndexMappings).toHaveBeenCalledTimes(2);
        }
      );

      it('is retryable when the failures are a mix of permanent and transient ones', async () => {
        const error = await runWithFailures({
          forbidden: wrappedMigrationError(esResponseError(403)),
          unavailable: wrappedMigrationError(esResponseError(503)),
        });

        expect(isRetryableError(error)).toBe(true);
        expect(isUnrecoverableError(error)).toBe(false);
      });

      it.each([500, 503, 429, 404])('is retryable for a %i from Elasticsearch', async (status) => {
        const error = await runWithFailures({
          broken: wrappedMigrationError(esResponseError(status)),
        });

        expect(isRetryableError(error)).toBe(true);
        expect(isUnrecoverableError(error)).toBe(false);
      });

      it('is retryable for an error without any status code', async () => {
        const error = await runWithFailures({ broken: new Error('boom') });

        expect(isRetryableError(error)).toBe(true);
        expect(isUnrecoverableError(error)).toBe(false);
      });

      it('reads the status code from the cause of a wrapped error, not from its message', async () => {
        const error = await runWithFailures({
          broken: new Error('looks transient: 503 service unavailable', {
            cause: wrappedMigrationError(esResponseError(403)),
          }),
        });

        expect(isUnrecoverableError(error)).toBe(true);
      });

      it('does not treat a permanent-looking message without a status code as permanent', async () => {
        const error = await runWithFailures({ broken: new Error('403 Forbidden') });

        expect(isRetryableError(error)).toBe(true);
      });

      describe('status code shapes and limits', () => {
        const withCause = (cause: unknown): Error => new Error('wrapper', { cause });
        /** An error whose status sits `depth` causes down: depth 0 is the error itself. */
        const chainWithStatusAt = (depth: number, status: object): unknown =>
          depth === 0 ? status : withCause(chainWithStatusAt(depth - 1, status));

        it.each([
          ['meta.statusCode only', { meta: { statusCode: 403 } }],
          ['output.statusCode only (Boom shape)', { output: { statusCode: 401 } }],
          ['output.statusCode inside a cause', withCause({ output: { statusCode: 400 } })],
          ['meta.statusCode inside a cause', withCause({ meta: { statusCode: 403 } })],
          ['a status as deep as the limit allows', chainWithStatusAt(5, { statusCode: 403 })],
        ])('is unrecoverable for %s', async (_description, failure) => {
          const error = await runWithFailures({ broken: failure });

          expect(isUnrecoverableError(error)).toBe(true);
        });

        it.each([
          ['a status beyond the cause depth limit', chainWithStatusAt(6, { statusCode: 403 })],
          ['a status of another kind in meta', { meta: { statusCode: 500 } }],
          ['a non numeric status code', { statusCode: '403' }],
          ['a string', 'forbidden'],
          ['null', null],
          ['undefined', undefined],
          ['a number', 403],
        ])('is retryable for %s', async (_description, failure) => {
          const error = await runWithFailures({ broken: failure });

          expect(isRetryableError(error)).toBe(true);
          expect(isUnrecoverableError(error)).toBe(false);
        });

        it('terminates on a cause cycle without a status, and retries', async () => {
          const first = new Error('first');
          const second = new Error('second', { cause: first });
          first.cause = second;

          const error = await runWithFailures({ broken: first });

          expect(isRetryableError(error)).toBe(true);
          expect(isUnrecoverableError(error)).toBe(false);
        });
      });

      it('reads the status code of a Boom error', async () => {
        const error = await runWithFailures({
          broken: SavedObjectsErrorHelpers.createBadRequestError('nope'),
        });

        expect(isUnrecoverableError(error)).toBe(true);
      });

      it('still logs every failed space with its namespace', async () => {
        await runWithFailures({
          first: wrappedMigrationError(esResponseError(403)),
          second: wrappedMigrationError(esResponseError(403)),
        });

        const messages = logger.error.mock.calls.map(([message]) => String(message));
        expect(messages).toHaveLength(2);
        expect(messages[0]).toContain('"first"');
        expect(messages[1]).toContain('"second"');
      });
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

    it('turns an abort in the middle of the last space into a retryable error, not a space failure', async () => {
      givenNamespaces('only');
      const controller = new AbortController();
      mockMigrateLatestIndexMappings.mockImplementationOnce(async () => {
        controller.abort();
        throw new Error('Request aborted');
      });

      const error = await getRejection(
        runLatestIndexMappingsMigration({ coreStart, logger, signal: controller.signal })
      );

      expect(error.message).toMatch(/aborted/i);
      expect(error.message).not.toContain('failed in');
      expect(isRetryableError(error)).toBe(true);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('treats any error of a space as an abort once the signal is aborted, and does not run the next space', async () => {
      givenNamespaces('first', 'second');
      const controller = new AbortController();
      mockMigrateLatestIndexMappings.mockImplementationOnce(async () => {
        controller.abort();
        // Nothing in this error says it was an abort
        throw new Error('socket hang up');
      });

      const error = await getRejection(
        runLatestIndexMappingsMigration({ coreStart, logger, signal: controller.signal })
      );

      expect(error.message).toMatch(/aborted/i);
      expect(isRetryableError(error)).toBe(true);
      expect(mockMigrateLatestIndexMappings).toHaveBeenCalledTimes(1);
      expect(logger.error).not.toHaveBeenCalled();
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

    it('does not retry when listing the namespaces fails with a bad request (400)', async () => {
      mockFind.mockRejectedValue(SavedObjectsErrorHelpers.createBadRequestError('bad request'));
      const runner = register().createTaskRunner({
        signal: new AbortController().signal,
      } as RunContext);

      const error = await getRejection(runner.run());

      expect(isUnrecoverableError(error)).toBe(true);
      expect(isRetryableError(error)).toBeFalsy();
    });

    it('keeps an all-permanent space failure unrecoverable through the task runner', async () => {
      givenNamespaces('first', 'second');
      mockMigrateLatestIndexMappings.mockRejectedValue(wrappedMigrationError(esResponseError(403)));
      const runner = register().createTaskRunner({
        signal: new AbortController().signal,
      } as RunContext);

      const error = await getRejection(runner.run());

      expect(isUnrecoverableError(error)).toBe(true);
      expect(mockMigrateLatestIndexMappings).toHaveBeenCalledTimes(2);
    });

    it('keeps a mixed space failure retryable through the task runner', async () => {
      givenNamespaces('first', 'second');
      mockMigrateLatestIndexMappings
        .mockRejectedValueOnce(wrappedMigrationError(esResponseError(403)))
        .mockRejectedValueOnce(wrappedMigrationError(esResponseError(500)));
      const runner = register().createTaskRunner({
        signal: new AbortController().signal,
      } as RunContext);

      const error = await getRejection(runner.run());

      expect(isRetryableError(error)).toBe(true);
      expect(isUnrecoverableError(error)).toBe(false);
    });

    it('retries when the saved object type is not registered: the repository throws a plain error without a status', async () => {
      mockFind.mockRejectedValue(
        new Error('Missing mappings for saved objects types: entity-engine-descriptor')
      );
      const runner = register().createTaskRunner({
        signal: new AbortController().signal,
      } as RunContext);

      const error = await getRejection(runner.run());

      expect(isRetryableError(error)).toBe(true);
      expect(isUnrecoverableError(error)).toBe(false);
    });

    it('does not decide on the error message: a plain error that mentions an unknown type is retried', async () => {
      mockFind.mockRejectedValue(new Error('Unsupported saved object type: not defined'));
      const runner = register().createTaskRunner({
        signal: new AbortController().signal,
      } as RunContext);

      const error = await getRejection(runner.run());

      expect(isRetryableError(error)).toBe(true);
      expect(isUnrecoverableError(error)).toBe(false);
    });

    it('leaves logging of the thrown error to Task Manager', async () => {
      mockFind.mockRejectedValue(new Error('so unavailable'));
      const runner = register().createTaskRunner({
        signal: new AbortController().signal,
      } as RunContext);

      await getRejection(runner.run());

      expect(logger.error).not.toHaveBeenCalled();
    });

    it('registers a description and an explicit normal cost', () => {
      expect(register()).toEqual(
        expect.objectContaining({
          description: expect.stringMatching(/\S/),
          cost: TaskCost.Normal,
        })
      );
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
