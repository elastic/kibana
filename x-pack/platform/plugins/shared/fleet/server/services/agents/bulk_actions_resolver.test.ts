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

    it('bumps only the timestamp for a heartbeat, leaving the checkpoint alone', async () => {
      // a heartbeat landing after a batch advanced the checkpoint must not roll it back
      await resolver.updateCheckTaskState('task1:check', {});

      const stateMapFn = taskManager.bulkUpdateState.mock.calls[0][1];
      expect(stateMapFn({ searchAfter: ['a'], nbAgentsProcessed: 20000 }, 'task1:check')).toEqual({
        searchAfter: ['a'],
        nbAgentsProcessed: 20000,
        checkpointUpdatedAt: expect.any(String),
      });
    });
  });

  describe('taskExists', () => {
    it('is true for a task that exists', async () => {
      taskManager.get.mockResolvedValue({ id: 'task1' } as any);

      await expect(resolver.taskExists('task1')).resolves.toBe(true);
    });

    it('is false when the task cannot be read, so the caller still schedules', async () => {
      taskManager.get.mockRejectedValue(new Error('Saved object not found'));

      await expect(resolver.taskExists('task1')).resolves.toBe(false);
    });
  });
});

describe('createRetryTask', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const soClient = savedObjectsClientMock.create();
  let resolver: {
    removeIfExists: jest.Mock;
    getCheckTaskState: jest.Mock;
    taskExists: jest.Mock;
    getTaskId: jest.Mock;
    run: jest.Mock;
  };

  const getDeps = async () => ({ esClient, soClient });

  const CHECK_TASK_ID = `${BulkActionTaskType.REASSIGN_RETRY}:check:action1`;
  const RETRY_TASK_ID = `${BulkActionTaskType.REASSIGN_RETRY}:action1`;
  const CHECK_TASK_SCHEDULE = { interval: `${CHECK_TASK_INTERVAL_MINUTES}m` };
  /** A checkpoint the runner wrote but has not touched since the previous check task run. */
  const STALLED_CHECKPOINT = {
    checkpointUpdatedAt: '2026-10-16T18:48:34.000Z',
    lastObservedCheckpointAt: '2026-10-16T18:48:34.000Z',
  };

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
    resolver = {
      removeIfExists: jest.fn(),
      getCheckTaskState: jest.fn(),
      taskExists: jest.fn().mockResolvedValue(false),
      getTaskId: jest.fn((actionId: string, type: string) => `${type}:${actionId}`),
      run: jest.fn(),
    };
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
    it('asks task manager to delete it once the checkpoint says every agent was processed', async () => {
      const result = await createRetryTask(
        createTaskInstance({ state: { nbAgentsProcessed: 100000 } }),
        getDeps,
        jest.fn()
      ).run();

      // removing itself and then returning would make task manager update a document that no
      // longer exists, which a recurring task's update does not treat as success
      expect(resolver.removeIfExists).not.toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ shouldDeleteTask: true }));
      expect(resolver.run).not.toHaveBeenCalled();
    });

    it('does not use action document counts to decide completion', async () => {
      // rollback writes its documents under its own action ids, so a runner can be mid-flight
      // with no documents at all under this action id
      const result = await createRetryTask(
        createTaskInstance({ state: { nbAgentsProcessed: 20000 } }),
        getDeps,
        jest.fn()
      ).run();

      expect(result).not.toEqual(expect.objectContaining({ shouldDeleteTask: true }));
      expect(resolver.run).toHaveBeenCalled();
    });

    it('does not resume while a batch was written within the interval', async () => {
      mockRecentBatch(true);

      await createRetryTask(createTaskInstance(), getDeps, jest.fn()).run();

      expect(resolver.run).not.toHaveBeenCalled();
      expect(resolver.removeIfExists).not.toHaveBeenCalled();
    });

    it('returns the recurring schedule, so a legacy one-shot check task is adopted', async () => {
      // such a task is Running while it is handled here, and bulkUpdateSchedules only updates
      // Idle tasks, so ensureScheduled from the resumed runner cannot change its schedule
      mockRecentBatch(true);

      const result = await createRetryTask(createTaskInstance(), getDeps, jest.fn()).run();

      expect(result).toEqual(expect.objectContaining({ schedule: CHECK_TASK_SCHEDULE }));
    });

    it('does not resume while the runner keeps moving the checkpoint', async () => {
      const result = await createRetryTask(
        createTaskInstance({
          state: {
            searchAfter: ['a'],
            checkpointUpdatedAt: '2026-10-16T18:48:34.000Z',
            lastObservedCheckpointAt: '2026-10-16T18:43:30.000Z',
          },
        }),
        getDeps,
        jest.fn()
      ).run();

      expect(resolver.run).not.toHaveBeenCalled();
      expect(result).toEqual({
        state: expect.objectContaining({
          lastObservedCheckpointAt: '2026-10-16T18:48:34.000Z',
        }),
        schedule: CHECK_TASK_SCHEDULE,
      });
    });

    it('does not resume a runner that has only just stamped its start', async () => {
      // the runner stamps the checkpoint before its first batch, so a first batch slower than the
      // interval is not mistaken for a dead runner and given a second runner alongside it
      const result = await createRetryTask(
        createTaskInstance({
          state: { checkpointUpdatedAt: '2026-10-16T18:48:34.000Z', nbAgentsProcessed: 0 },
        }),
        getDeps,
        jest.fn()
      ).run();

      expect(resolver.run).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          state: expect.objectContaining({
            lastObservedCheckpointAt: '2026-10-16T18:48:34.000Z',
          }),
        })
      );
    });

    it('merges watcher fields onto the freshest state, not the claimed one', async () => {
      // the live runner checkpointed while this check was running
      resolver.getCheckTaskState.mockResolvedValue({
        searchAfter: ['newer'],
        nbAgentsProcessed: 40000,
        checkpointUpdatedAt: '2026-10-16T18:50:00.000Z',
      });
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
        jest.fn()
      ).run();

      // the freshest checkpoint timestamp is what gets recorded as observed, so the next run
      // compares against what this one actually saw rather than against a stale value
      expect(result).toEqual({
        state: {
          searchAfter: ['newer'],
          nbAgentsProcessed: 40000,
          checkpointUpdatedAt: '2026-10-16T18:50:00.000Z',
          lastObservedCheckpointAt: '2026-10-16T18:50:00.000Z',
        },
        schedule: CHECK_TASK_SCHEDULE,
      });
    });

    it('re-reads the state after the liveness probe before deciding to resume', async () => {
      // the runner heartbeats while a batch is in flight; one landing during the probe above
      // would otherwise be missed and earn a live runner a second runner alongside it
      resolver.getCheckTaskState.mockResolvedValue({
        searchAfter: ['lastAgent'],
        checkpointUpdatedAt: '2026-10-16T18:50:00.000Z',
      });

      await createRetryTask(
        createTaskInstance({
          state: {
            searchAfter: ['lastAgent'],
            checkpointUpdatedAt: '2026-10-16T18:48:34.000Z',
            lastObservedCheckpointAt: '2026-10-16T18:48:34.000Z',
          },
        }),
        getDeps,
        jest.fn()
      ).run();

      expect(resolver.run).not.toHaveBeenCalled();
    });

    it('does not resume into a retry task that is already queued', async () => {
      // ensureScheduled is a no-op on an id that already exists, so this would log a resume and
      // spend an attempt without scheduling anything
      resolver.taskExists.mockResolvedValue(true);

      const result = await createRetryTask(
        createTaskInstance({
          state: {
            searchAfter: ['lastAgent'],
            checkpointUpdatedAt: '2026-10-16T18:48:34.000Z',
            lastObservedCheckpointAt: '2026-10-16T18:48:34.000Z',
          },
        }),
        getDeps,
        jest.fn()
      ).run();

      expect(resolver.taskExists).toHaveBeenCalledWith(RETRY_TASK_ID);
      expect(resolver.run).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({ state: expect.not.objectContaining({ resumeCount: 1 }) })
      );
    });

    it('hands the resume to the retry task rather than running it here', async () => {
      const result = await createRetryTask(
        createTaskInstance({
          state: {
            searchAfter: ['lastAgent'],
            checkpointUpdatedAt: '2026-10-16T18:48:34.000Z',
            lastObservedCheckpointAt: '2026-10-16T18:48:34.000Z',
          },
        }),
        getDeps,
        jest.fn()
      ).run();

      // running it here would let the runner checkpoint while task manager persists the state
      // returned below, losing that checkpoint
      expect(resolver.run).toHaveBeenCalledWith(
        expect.objectContaining({ actionId: 'action1' }),
        expect.objectContaining({
          searchAfter: ['lastAgent'],
          retryCount: 1,
          taskId: RETRY_TASK_ID,
        }),
        BulkActionTaskType.REASSIGN_RETRY,
        RETRY_TASK_ID,
        // the default backoff sleeps past this task's 1m timeout, and an expired run would lose
        // the recurring schedule returned below; the next interval is the retry instead
        { maxRetryAttempts: 0 }
      );
      expect(result).toEqual(
        expect.objectContaining({ state: expect.objectContaining({ resumeCount: 1 }) })
      );
    });

    it('keeps the original point in time when resuming, so the cursor stays meaningful', async () => {
      // the saved cursor's implicit _shard_doc tiebreaker only means anything inside the point in
      // time that produced it; a stall shorter than the keep alive leaves it usable
      await createRetryTask(
        createTaskInstance({
          state: {
            searchAfter: ['lastAgent'],
            pitId: 'stale-pit',
            ...STALLED_CHECKPOINT,
          },
        }),
        getDeps,
        jest.fn()
      ).run();

      expect(resolver.run).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ pitId: 'stale-pit', searchAfter: ['lastAgent'] }),
        expect.anything(),
        RETRY_TASK_ID,
        expect.anything()
      );
    });

    it('prefers the checkpointed point in time over the one the action started with', async () => {
      // Elasticsearch can hand back a new id on any search, and only the latest is valid
      await createRetryTask(
        createTaskInstance({
          state: {
            searchAfter: ['lastAgent'],
            pitId: 'latest-pit',
            ...STALLED_CHECKPOINT,
          },
        }),
        getDeps,
        jest.fn()
      ).run();

      expect(resolver.run).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ pitId: 'latest-pit' }),
        expect.anything(),
        RETRY_TASK_ID,
        expect.anything()
      );
    });

    it('drops the checkpoint for update tags, which must restart from scratch', async () => {
      await createRetryTask(
        createTaskInstance({
          taskType: BulkActionTaskType.UPDATE_AGENT_TAGS_RETRY,
          state: { searchAfter: ['lastAgent'] },
        }),
        getDeps,
        jest.fn()
      ).run();

      expect(resolver.run).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ searchAfter: undefined, pitId: undefined }),
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });

    it('treats a legacy check task with no isCheckTask param as a check task', async () => {
      const result = await createRetryTask(
        createTaskInstance({
          params: {
            actionParams: { kuery: '', actionId: 'action1', total: 100000, batchSize: 10000 },
            retryParams: { retryCount: 1 },
          },
          state: { nbAgentsProcessed: 100000 },
        }),
        getDeps,
        jest.fn()
      ).run();

      // it took the check branch (asked to be deleted) rather than launching a runner
      expect(result).toEqual(expect.objectContaining({ shouldDeleteTask: true }));
      expect(resolver.run).not.toHaveBeenCalled();
    });

    it('falls back to the params checkpoint for a legacy check task', async () => {
      // tasks scheduled before this change kept the checkpoint in params and have empty state
      await createRetryTask(
        createTaskInstance({
          params: {
            actionParams: { kuery: '', actionId: 'action1', total: 100000, batchSize: 10000 },
            retryParams: { retryCount: 1, searchAfter: ['legacy'], nbAgentsProcessed: 30000 },
          },
          state: {},
        }),
        getDeps,
        jest.fn()
      ).run();

      expect(resolver.run).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          searchAfter: ['legacy'],
          nbAgentsProcessed: 30000,
        }),
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });

    it('prefers the state checkpoint over the params one', async () => {
      await createRetryTask(
        createTaskInstance({
          params: {
            actionParams: { kuery: '', actionId: 'action1', total: 100000, batchSize: 10000 },
            retryParams: { retryCount: 1, searchAfter: ['legacy'] },
            isCheckTask: true,
          },
          state: {
            searchAfter: ['current'],
            ...STALLED_CHECKPOINT,
          },
        }),
        getDeps,
        jest.fn()
      ).run();

      expect(resolver.run).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ searchAfter: ['current'] }),
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });

    it('does not hand back a cursor the runner deliberately cleared', async () => {
      // a 400 restart clears the cursor and the count together; falling back to the params would
      // resurrect the cursor Elasticsearch just rejected
      await createRetryTask(
        createTaskInstance({
          params: {
            actionParams: { kuery: '', actionId: 'action1', total: 100000, batchSize: 10000 },
            retryParams: { retryCount: 1, searchAfter: ['rejected'], nbAgentsProcessed: 30000 },
            isCheckTask: true,
          },
          state: { nbAgentsProcessed: 0, ...STALLED_CHECKPOINT },
        }),
        getDeps,
        jest.fn()
      ).run();

      expect(resolver.run).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ searchAfter: undefined, nbAgentsProcessed: 0 }),
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });

    it('stops resuming after MAX_CHECK_TASK_RESUMES attempts', async () => {
      const result = await createRetryTask(
        createTaskInstance({ state: { resumeCount: MAX_CHECK_TASK_RESUMES } }),
        getDeps,
        jest.fn()
      ).run();

      expect(resolver.run).not.toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ shouldDeleteTask: true }));
      expect(resolver.removeIfExists).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('stalled after'));
    });

    it('keeps watching, and counts the attempt, when scheduling the resume fails', async () => {
      resolver.run.mockRejectedValue(new Error('Request timed out'));

      const result = await createRetryTask(createTaskInstance(), getDeps, jest.fn()).run();

      // the watchdog survives so the next tick can try again, but the attempt still counts:
      // otherwise an action whose resume can never be scheduled is watched forever
      expect(result).toEqual({
        state: expect.objectContaining({ resumeCount: 1 }),
        schedule: CHECK_TASK_SCHEDULE,
      });
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

      expect(result).toEqual({ state: { resumeCount: 3 }, schedule: CHECK_TASK_SCHEDULE });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('check task'),
        expect.anything()
      );
    });
  });
});
