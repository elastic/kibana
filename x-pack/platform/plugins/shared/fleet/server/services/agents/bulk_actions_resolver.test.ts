/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('timers/promises');

import { errors as EsErrors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';

import { appContextService } from '../app_context';

import { BulkActionsResolver, createRetryTask } from './bulk_actions_resolver';
import { BulkActionTaskType } from './bulk_action_types';
import { CHECK_TASK_INTERVAL_MINUTES, MAX_CHECK_TASK_RESUMES } from './retry_helper';

const logger = loggerMock.create();

describe('BulkActionsResolver', () => {
  let taskManager: ReturnType<typeof taskManagerMock.createStart>;
  let resolver: BulkActionsResolver;

  beforeEach(async () => {
    jest.clearAllMocks();
    loggerMock.clear(logger);
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(logger);
    taskManager = taskManagerMock.createStart();
    resolver = Object.create(BulkActionsResolver.prototype) as BulkActionsResolver;
    await resolver.start(taskManager);
  });

  describe('run', () => {
    it('schedules a one-off task by default', async () => {
      await resolver.run(
        { kuery: '', actionId: 'action1' },
        { retryCount: 1 },
        'taskType',
        'task1'
      );

      expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'task1',
          taskType: 'taskType',
          params: {
            actionParams: { kuery: '', actionId: 'action1' },
            retryParams: { retryCount: 1 },
          },
        })
      );
      expect(taskManager.ensureScheduled.mock.calls[0][0].schedule).toBeUndefined();
    });

    it('schedules the check task as a recurring task flagged with isCheckTask', async () => {
      await resolver.run({ kuery: '', actionId: 'action1' }, {}, 'taskType', 'task1:check', {
        schedule: { interval: `${CHECK_TASK_INTERVAL_MINUTES}m` },
        isCheckTask: true,
      });

      const scheduled = taskManager.ensureScheduled.mock.calls[0][0];
      expect(scheduled.schedule).toEqual({ interval: '5m' });
      expect(scheduled.params.isCheckTask).toBe(true);
    });

    it('retries a transient Elasticsearch error instead of failing the caller', async () => {
      taskManager.ensureScheduled
        .mockRejectedValueOnce(new EsErrors.TimeoutError('Request timed out'))
        .mockResolvedValue({} as any);

      await expect(resolver.run({ kuery: '' }, {}, 'taskType', 'task1')).resolves.toEqual('task1');
      expect(taskManager.ensureScheduled).toHaveBeenCalledTimes(2);
    });

    it('does not throw when task manager is not started yet', async () => {
      const unstarted = Object.create(BulkActionsResolver.prototype) as BulkActionsResolver;

      await expect(unstarted.run({ kuery: '' }, {}, 'taskType', 'task1')).resolves.toEqual('task1');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Task manager is not available')
      );
    });
  });

  describe('removeIfExists', () => {
    it('retries a transient Elasticsearch error', async () => {
      taskManager.removeIfExists
        .mockRejectedValueOnce(new EsErrors.TimeoutError('Request timed out'))
        .mockResolvedValue(undefined);

      await expect(resolver.removeIfExists('task1')).resolves.toBeUndefined();
      expect(taskManager.removeIfExists).toHaveBeenCalledTimes(2);
    });

    it('propagates a non-transient error', async () => {
      taskManager.removeIfExists.mockRejectedValue(new Error('boom'));

      await expect(resolver.removeIfExists('task1')).rejects.toThrow('boom');
    });
  });

  describe('updateCheckTaskState', () => {
    it('merges the checkpoint into the existing state and stamps it', async () => {
      await resolver.updateCheckTaskState('task1:check', {
        searchAfter: ['a', 'b'],
        nbAgentsProcessed: 20000,
      });

      expect(taskManager.bulkUpdateState).toHaveBeenCalledWith(
        ['task1:check'],
        expect.any(Function)
      );

      const stateMapFn = taskManager.bulkUpdateState.mock.calls[0][1];
      expect(stateMapFn({ resumeCount: 2 }, 'task1:check')).toEqual({
        resumeCount: 2,
        searchAfter: ['a', 'b'],
        nbAgentsProcessed: 20000,
        checkpointUpdatedAt: expect.any(String),
      });
    });

    it('retries a transient Elasticsearch error', async () => {
      taskManager.bulkUpdateState
        .mockRejectedValueOnce(new EsErrors.TimeoutError('Request timed out'))
        .mockResolvedValue({ tasks: [], errors: [] } as any);

      await expect(
        resolver.updateCheckTaskState('task1:check', { nbAgentsProcessed: 1 })
      ).resolves.toBeUndefined();
      expect(taskManager.bulkUpdateState).toHaveBeenCalledTimes(2);
    });

    it('throws when the update failed for the task', async () => {
      // bulkUpdateState resolves with per-task failures in `errors` rather than throwing
      taskManager.bulkUpdateState.mockResolvedValue({
        tasks: [],
        errors: [{ type: 'task', id: 'task1:check', error: { message: 'Not Found' } }],
      } as any);

      await expect(
        resolver.updateCheckTaskState('task1:check', { nbAgentsProcessed: 1 })
      ).rejects.toThrow('Could not update the state of task task1:check: Not Found');
    });
  });
});

describe('createRetryTask', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const soClient = savedObjectsClientMock.create();
  let resolver: {
    removeIfExists: jest.Mock;
    getCheckTaskState: jest.Mock;
  };

  const getDeps = async () => ({ esClient, soClient });

  const CHECK_TASK_ID = `${BulkActionTaskType.REASSIGN_RETRY}:check:action1`;

  const createTaskInstance = (
    overrides: Partial<ConcreteTaskInstance> = {}
  ): ConcreteTaskInstance =>
    ({
      id: CHECK_TASK_ID,
      taskType: BulkActionTaskType.REASSIGN_RETRY,
      params: {
        actionParams: { kuery: '', actionId: 'action1', total: 100000, batchSize: 10000 },
        retryParams: { retryCount: 1, pitId: 'stale-pit' },
        isCheckTask: true,
      },
      state: {},
      ...overrides,
    } as ConcreteTaskInstance);

  /** The liveness probe returns one hit when a batch landed within the interval. */
  const mockRecentBatch = (hasRecentBatch: boolean) => {
    esClient.search.mockResolvedValue({
      hits: { hits: hasRecentBatch ? [{ _id: 'a' }] : [] },
    } as any);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    loggerMock.clear(logger);
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(logger);
    resolver = { removeIfExists: jest.fn(), getCheckTaskState: jest.fn() };
    jest.spyOn(appContextService, 'getBulkActionsResolver').mockReturnValue(resolver as any);
    mockRecentBatch(false);
  });

  describe('retry task', () => {
    it('does not await the runner, but catches its rejection', async () => {
      const doRetry = jest.fn().mockRejectedValue(new Error('Request timed out'));

      const task = createRetryTask(
        createTaskInstance({
          id: `${BulkActionTaskType.REASSIGN_RETRY}:action1`,
          params: {
            actionParams: { kuery: '', actionId: 'action1' },
            retryParams: { retryCount: 1 },
          },
        }),
        getDeps,
        doRetry
      );

      await expect(task.run()).resolves.toBeUndefined();
      await new Promise(process.nextTick);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('failed: Request timed out'),
        expect.anything()
      );
    });

    it('passes the checkpoint from params to the runner', async () => {
      const doRetry = jest.fn().mockResolvedValue({ actionId: 'action1' });

      await createRetryTask(
        createTaskInstance({
          id: `${BulkActionTaskType.REASSIGN_RETRY}:action1`,
          params: {
            actionParams: { kuery: '', actionId: 'action1' },
            retryParams: { retryCount: 2, searchAfter: ['a'] },
          },
        }),
        getDeps,
        doRetry
      ).run();

      expect(doRetry).toHaveBeenCalledWith(
        esClient,
        soClient,
        { kuery: '', actionId: 'action1' },
        expect.objectContaining({ retryCount: 2, searchAfter: ['a'] })
      );
    });
  });

  describe('check task', () => {
    it('removes itself once the checkpoint says every agent was processed', async () => {
      const doRetry = jest.fn();

      await createRetryTask(
        createTaskInstance({ state: { nbAgentsProcessed: 100000 } }),
        getDeps,
        doRetry
      ).run();

      expect(resolver.removeIfExists).toHaveBeenCalledWith(CHECK_TASK_ID);
      expect(doRetry).not.toHaveBeenCalled();
    });

    it('does not use action document counts to decide completion', async () => {
      // rollback writes its documents under its own action ids, so a runner can be mid-flight
      // with no documents at all under this action id
      const doRetry = jest.fn().mockResolvedValue({ actionId: 'action1' });

      await createRetryTask(
        createTaskInstance({ state: { nbAgentsProcessed: 20000 } }),
        getDeps,
        doRetry
      ).run();

      expect(resolver.removeIfExists).not.toHaveBeenCalled();
      expect(doRetry).toHaveBeenCalled();
    });

    it('does not resume while a batch was written within the interval', async () => {
      mockRecentBatch(true);
      const doRetry = jest.fn();

      await createRetryTask(createTaskInstance(), getDeps, doRetry).run();

      expect(doRetry).not.toHaveBeenCalled();
      expect(resolver.removeIfExists).not.toHaveBeenCalled();
    });

    it('does not resume while the runner keeps moving the checkpoint', async () => {
      const doRetry = jest.fn();

      const result = await createRetryTask(
        createTaskInstance({
          state: {
            searchAfter: ['a'],
            checkpointUpdatedAt: '2026-10-16T18:48:34.000Z',
            lastObservedCheckpointAt: '2026-10-16T18:43:30.000Z',
          },
        }),
        getDeps,
        doRetry
      ).run();

      expect(doRetry).not.toHaveBeenCalled();
      expect(result).toEqual({
        state: expect.objectContaining({
          lastObservedCheckpointAt: '2026-10-16T18:48:34.000Z',
        }),
      });
    });

    it('merges watcher fields onto the freshest state, not the claimed one', async () => {
      // the live runner checkpointed while this check was running
      resolver.getCheckTaskState.mockResolvedValue({
        searchAfter: ['newer'],
        nbAgentsProcessed: 40000,
        checkpointUpdatedAt: '2026-10-16T18:50:00.000Z',
      });
      const doRetry = jest.fn();

      const result = await createRetryTask(
        createTaskInstance({
          state: {
            searchAfter: ['older'],
            nbAgentsProcessed: 20000,
            checkpointUpdatedAt: '2026-10-16T18:48:34.000Z',
            lastObservedCheckpointAt: '2026-10-16T18:43:30.000Z',
          },
        }),
        getDeps,
        doRetry
      ).run();

      expect(result).toEqual({
        state: {
          searchAfter: ['newer'],
          nbAgentsProcessed: 40000,
          checkpointUpdatedAt: '2026-10-16T18:50:00.000Z',
          lastObservedCheckpointAt: '2026-10-16T18:48:34.000Z',
        },
      });
    });

    it('resumes the runner from the checkpoint when nothing progressed', async () => {
      const doRetry = jest.fn().mockResolvedValue({ actionId: 'action1' });

      const result = await createRetryTask(
        createTaskInstance({
          state: {
            searchAfter: ['lastAgent'],
            checkpointUpdatedAt: '2026-10-16T18:48:34.000Z',
            lastObservedCheckpointAt: '2026-10-16T18:48:34.000Z',
          },
        }),
        getDeps,
        doRetry
      ).run();

      expect(doRetry).toHaveBeenCalledWith(
        esClient,
        soClient,
        expect.objectContaining({ actionId: 'action1' }),
        expect.objectContaining({
          searchAfter: ['lastAgent'],
          retryCount: 1,
          taskId: CHECK_TASK_ID,
        })
      );
      expect(result).toEqual({ state: expect.objectContaining({ resumeCount: 1 }) });
    });

    it('drops the expired point in time when resuming', async () => {
      const doRetry = jest.fn().mockResolvedValue({ actionId: 'action1' });

      await createRetryTask(
        createTaskInstance({ state: { searchAfter: ['lastAgent'] } }),
        getDeps,
        doRetry
      ).run();

      expect(doRetry).toHaveBeenCalledWith(
        esClient,
        soClient,
        expect.anything(),
        expect.objectContaining({ pitId: undefined, searchAfter: ['lastAgent'] })
      );
    });

    it('drops the checkpoint for update tags, which must restart from scratch', async () => {
      const doRetry = jest.fn().mockResolvedValue({ actionId: 'action1' });

      await createRetryTask(
        createTaskInstance({
          taskType: BulkActionTaskType.UPDATE_AGENT_TAGS_RETRY,
          state: { searchAfter: ['lastAgent'] },
        }),
        getDeps,
        doRetry
      ).run();

      expect(doRetry).toHaveBeenCalledWith(
        esClient,
        soClient,
        expect.anything(),
        expect.objectContaining({ searchAfter: undefined, pitId: undefined })
      );
    });

    it('treats a legacy check task with no isCheckTask param as a check task', async () => {
      const doRetry = jest.fn();

      await createRetryTask(
        createTaskInstance({
          params: {
            actionParams: { kuery: '', actionId: 'action1', total: 100000, batchSize: 10000 },
            retryParams: { retryCount: 1 },
          },
          state: { nbAgentsProcessed: 100000 },
        }),
        getDeps,
        doRetry
      ).run();

      // it took the check branch (removed itself) rather than launching a runner
      expect(resolver.removeIfExists).toHaveBeenCalledWith(CHECK_TASK_ID);
      expect(doRetry).not.toHaveBeenCalled();
    });

    it('falls back to the params checkpoint for a legacy check task', async () => {
      // tasks scheduled before this change kept the checkpoint in params and have empty state
      const doRetry = jest.fn().mockResolvedValue({ actionId: 'action1' });

      await createRetryTask(
        createTaskInstance({
          params: {
            actionParams: { kuery: '', actionId: 'action1', total: 100000, batchSize: 10000 },
            retryParams: { retryCount: 1, searchAfter: ['legacy'], nbAgentsProcessed: 30000 },
          },
          state: {},
        }),
        getDeps,
        doRetry
      ).run();

      expect(doRetry).toHaveBeenCalledWith(
        esClient,
        soClient,
        expect.anything(),
        expect.objectContaining({
          searchAfter: ['legacy'],
          nbAgentsProcessed: 30000,
          pitId: undefined,
        })
      );
    });

    it('prefers the state checkpoint over the params one', async () => {
      const doRetry = jest.fn().mockResolvedValue({ actionId: 'action1' });

      await createRetryTask(
        createTaskInstance({
          params: {
            actionParams: { kuery: '', actionId: 'action1', total: 100000, batchSize: 10000 },
            retryParams: { retryCount: 1, searchAfter: ['legacy'] },
            isCheckTask: true,
          },
          state: { searchAfter: ['current'] },
        }),
        getDeps,
        doRetry
      ).run();

      expect(doRetry).toHaveBeenCalledWith(
        esClient,
        soClient,
        expect.anything(),
        expect.objectContaining({ searchAfter: ['current'] })
      );
    });

    it('stops resuming after MAX_CHECK_TASK_RESUMES attempts', async () => {
      const doRetry = jest.fn();

      await createRetryTask(
        createTaskInstance({ state: { resumeCount: MAX_CHECK_TASK_RESUMES } }),
        getDeps,
        doRetry
      ).run();

      expect(doRetry).not.toHaveBeenCalled();
      expect(resolver.removeIfExists).toHaveBeenCalledWith(CHECK_TASK_ID);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('stalled after'));
    });

    it('catches a rejection from the resumed runner', async () => {
      const doRetry = jest.fn().mockRejectedValue(new Error('Request timed out'));

      await createRetryTask(createTaskInstance(), getDeps, doRetry).run();
      await new Promise(process.nextTick);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Request timed out'),
        expect.anything()
      );
    });

    it('never throws out of the recurring task when the liveness probe fails', async () => {
      esClient.search.mockRejectedValue(new EsErrors.TimeoutError('Request timed out'));

      const result = await createRetryTask(
        createTaskInstance({ state: { resumeCount: 3 } }),
        getDeps,
        jest.fn()
      ).run();

      expect(result).toEqual({ state: { resumeCount: 3 } });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('check task'),
        expect.anything()
      );
    });
  });
});
