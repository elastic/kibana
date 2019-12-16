/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import sinon from 'sinon';
import { Subject } from 'rxjs';

import {
  asTaskMarkRunningEvent,
  asTaskRunEvent,
  asTaskClaimEvent,
  asTaskRunRequestEvent,
} from './task_events';
import {
  TaskManager,
  claimAvailableTasks,
  awaitTaskRunResult,
  TaskLifecycleEvent,
} from './task_manager';
// Task manager uses an unconventional directory structure so the linter marks this as a violation, server files should
// be moved under task_manager/server/
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { savedObjectsClientMock } from 'src/core/server/mocks';
import { SavedObjectsSerializer, SavedObjectsSchema } from 'src/core/server';
import { mockLogger } from './test_utils';
import { asErr, asOk } from './lib/result_type';
import { ConcreteTaskInstance, TaskLifecycleResult, TaskStatus } from './task';

const savedObjectsClient = savedObjectsClientMock.create();
const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());

describe('TaskManager', () => {
  let clock: sinon.SinonFakeTimers;
  const defaultConfig = {
    xpack: {
      task_manager: {
        max_workers: 10,
        index: 'foo',
        max_attempts: 9,
        poll_interval: 6000000,
      },
    },
    server: {
      uuid: 'some-uuid',
    },
  };
  const config = {
    get: (path: string) => _.get(defaultConfig, path),
  };
  const taskManagerOpts = {
    config,
    savedObjectsRepository: savedObjectsClient,
    serializer,
    callWithInternalUser: jest.fn(),
    logger: mockLogger(),
  };

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => clock.restore());

  test('throws if no valid UUID is available', async () => {
    expect(() => {
      const configWithoutServerUUID = {
        xpack: {
          task_manager: {
            max_workers: 10,
            index: 'foo',
            max_attempts: 9,
            poll_interval: 6000000,
          },
        },
      };
      new TaskManager({
        ...taskManagerOpts,
        config: {
          get: (path: string) => _.get(configWithoutServerUUID, path),
        },
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"TaskManager is unable to start as Kibana has no valid UUID assigned to it."`
    );
  });

  test('allows and queues scheduling tasks before starting', async () => {
    const client = new TaskManager(taskManagerOpts);
    client.registerTaskDefinitions({
      foo: {
        type: 'foo',
        title: 'Foo',
        createTaskRunner: jest.fn(),
      },
    });
    const task = {
      taskType: 'foo',
      params: {},
      state: {},
    };
    savedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'task',
      attributes: {},
      references: [],
    });
    const promise = client.schedule(task);
    client.start();
    await promise;

    expect(savedObjectsClient.create).toHaveBeenCalled();
  });

  test('allows scheduling tasks after starting', async () => {
    const client = new TaskManager(taskManagerOpts);
    client.registerTaskDefinitions({
      foo: {
        type: 'foo',
        title: 'Foo',
        createTaskRunner: jest.fn(),
      },
    });
    client.start();
    const task = {
      taskType: 'foo',
      params: {},
      state: {},
    };
    savedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'task',
      attributes: {},
      references: [],
    });
    await client.schedule(task);
    expect(savedObjectsClient.create).toHaveBeenCalled();
  });

  test('allows scheduling existing tasks that may have already been scheduled', async () => {
    const client = new TaskManager(taskManagerOpts);
    client.registerTaskDefinitions({
      foo: {
        type: 'foo',
        title: 'Foo',
        createTaskRunner: jest.fn(),
      },
    });
    savedObjectsClient.create.mockRejectedValueOnce({
      statusCode: 409,
    });

    client.start();

    const result = await client.ensureScheduled({
      id: 'my-foo-id',
      taskType: 'foo',
      params: {},
      state: {},
    });

    expect(result.id).toEqual('my-foo-id');
  });

  test('doesnt ignore failure to scheduling existing tasks for reasons other than already being scheduled', async () => {
    const client = new TaskManager(taskManagerOpts);
    client.registerTaskDefinitions({
      foo: {
        type: 'foo',
        title: 'Foo',
        createTaskRunner: jest.fn(),
      },
    });
    savedObjectsClient.create.mockRejectedValueOnce({
      statusCode: 500,
    });

    client.start();

    return expect(
      client.ensureScheduled({
        id: 'my-foo-id',
        taskType: 'foo',
        params: {},
        state: {},
      })
    ).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  test('doesnt allow naively rescheduling existing tasks that have already been scheduled', async () => {
    const client = new TaskManager(taskManagerOpts);
    client.registerTaskDefinitions({
      foo: {
        type: 'foo',
        title: 'Foo',
        createTaskRunner: jest.fn(),
      },
    });
    savedObjectsClient.create.mockRejectedValueOnce({
      statusCode: 409,
    });

    client.start();

    return expect(
      client.schedule({
        id: 'my-foo-id',
        taskType: 'foo',
        params: {},
        state: {},
      })
    ).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test('allows and queues removing tasks before starting', async () => {
    const client = new TaskManager(taskManagerOpts);
    savedObjectsClient.delete.mockResolvedValueOnce({});
    const promise = client.remove('1');
    client.start();
    await promise;
    expect(savedObjectsClient.delete).toHaveBeenCalled();
  });

  test('allows removing tasks after starting', async () => {
    const client = new TaskManager(taskManagerOpts);
    client.start();
    savedObjectsClient.delete.mockResolvedValueOnce({});
    await client.remove('1');
    expect(savedObjectsClient.delete).toHaveBeenCalled();
  });

  test('allows and queues fetching tasks before starting', async () => {
    const client = new TaskManager(taskManagerOpts);
    taskManagerOpts.callWithInternalUser.mockResolvedValue({
      hits: {
        total: {
          value: 0,
        },
        hits: [],
      },
    });
    const promise = client.fetch({});
    client.start();
    await promise;
    expect(taskManagerOpts.callWithInternalUser).toHaveBeenCalled();
  });

  test('allows fetching tasks after starting', async () => {
    const client = new TaskManager(taskManagerOpts);
    client.start();
    taskManagerOpts.callWithInternalUser.mockResolvedValue({
      hits: {
        total: {
          value: 0,
        },
        hits: [],
      },
    });
    await client.fetch({});
    expect(taskManagerOpts.callWithInternalUser).toHaveBeenCalled();
  });

  test('allows middleware registration before starting', () => {
    const client = new TaskManager(taskManagerOpts);
    const middleware = {
      beforeSave: async (saveOpts: any) => saveOpts,
      beforeRun: async (runOpts: any) => runOpts,
      beforeMarkRunning: async (runOpts: any) => runOpts,
    };
    expect(() => client.addMiddleware(middleware)).not.toThrow();
  });

  test('disallows middleware registration after starting', async () => {
    const client = new TaskManager(taskManagerOpts);
    const middleware = {
      beforeSave: async (saveOpts: any) => saveOpts,
      beforeRun: async (runOpts: any) => runOpts,
      beforeMarkRunning: async (runOpts: any) => runOpts,
    };

    client.start();

    expect(() => client.addMiddleware(middleware)).toThrow(
      /Cannot add middleware after the task manager is initialized/i
    );
  });

  describe('runNow', () => {
    describe('awaitTaskRunResult', () => {
      test('resolves when the task run succeeds', () => {
        const events$ = new Subject<TaskLifecycleEvent>();
        const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
        const getLifecycle = jest.fn();

        const result = awaitTaskRunResult(id, events$, getLifecycle);

        const task = { id } as ConcreteTaskInstance;
        events$.next(asTaskRunEvent(id, asOk(task)));

        return expect(result).resolves.toEqual({ id });
      });

      test('rejects when the task run fails', () => {
        const events$ = new Subject<TaskLifecycleEvent>();
        const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
        const getLifecycle = jest.fn();

        const result = awaitTaskRunResult(id, events$, getLifecycle);

        const task = { id } as ConcreteTaskInstance;
        events$.next(asTaskClaimEvent(id, asOk(task)));
        events$.next(asTaskMarkRunningEvent(id, asOk(task)));
        events$.next(asTaskRunEvent(id, asErr(new Error('some thing gone wrong'))));

        return expect(result).rejects.toEqual(new Error('some thing gone wrong'));
      });

      test('rejects when the task mark as running fails', () => {
        const events$ = new Subject<TaskLifecycleEvent>();
        const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
        const getLifecycle = jest.fn();

        const result = awaitTaskRunResult(id, events$, getLifecycle);

        const task = { id } as ConcreteTaskInstance;
        events$.next(asTaskClaimEvent(id, asOk(task)));
        events$.next(asTaskMarkRunningEvent(id, asErr(new Error('some thing gone wrong'))));

        return expect(result).rejects.toEqual(new Error('some thing gone wrong'));
      });

      test('when a task claim fails we ensure the task exists', async () => {
        const events$ = new Subject<TaskLifecycleEvent>();
        const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
        const getLifecycle = jest.fn(async () => TaskLifecycleResult.NotFound);

        const result = awaitTaskRunResult(id, events$, getLifecycle);

        events$.next(asTaskClaimEvent(id, asErr(new Error('failed to claim'))));

        await expect(result).rejects.toEqual(
          new Error(`Failed to run task "${id}" as it does not exist`)
        );

        expect(getLifecycle).toHaveBeenCalledWith(id);
      });

      test('when a task claim fails we ensure the task isnt already claimed', async () => {
        const events$ = new Subject<TaskLifecycleEvent>();
        const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
        const getLifecycle = jest.fn(async () => TaskStatus.Claiming);

        const result = awaitTaskRunResult(id, events$, getLifecycle);

        events$.next(asTaskClaimEvent(id, asErr(new Error('failed to claim'))));

        await expect(result).rejects.toEqual(
          new Error(`Failed to run task "${id}" as it is currently running`)
        );

        expect(getLifecycle).toHaveBeenCalledWith(id);
      });

      test('when a task claim fails we ensure the task isnt already running', async () => {
        const events$ = new Subject<TaskLifecycleEvent>();
        const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
        const getLifecycle = jest.fn(async () => TaskStatus.Running);

        const result = awaitTaskRunResult(id, events$, getLifecycle);

        events$.next(asTaskClaimEvent(id, asErr(new Error('failed to claim'))));

        await expect(result).rejects.toEqual(
          new Error(`Failed to run task "${id}" as it is currently running`)
        );

        expect(getLifecycle).toHaveBeenCalledWith(id);
      });

      test('rejects when the task run fails due to capacity', async () => {
        const events$ = new Subject<TaskLifecycleEvent>();
        const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
        const getLifecycle = jest.fn(async () => TaskStatus.Idle);

        const result = awaitTaskRunResult(id, events$, getLifecycle);

        events$.next(asTaskRunRequestEvent(id, asErr(new Error('failed to buffer request'))));

        await expect(result).rejects.toEqual(
          new Error(
            `Failed to run task "${id}" as Task Manager is at capacity, please try again later`
          )
        );
        expect(getLifecycle).not.toHaveBeenCalled();
      });

      test('when a task claim fails we return the underlying error if the task is idle', async () => {
        const events$ = new Subject<TaskLifecycleEvent>();
        const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
        const getLifecycle = jest.fn(async () => TaskStatus.Idle);

        const result = awaitTaskRunResult(id, events$, getLifecycle);

        events$.next(asTaskClaimEvent(id, asErr(new Error('failed to claim'))));

        await expect(result).rejects.toEqual(new Error('failed to claim'));

        expect(getLifecycle).toHaveBeenCalledWith(id);
      });

      test('when a task claim fails we return the underlying error if the task is failed', async () => {
        const events$ = new Subject<TaskLifecycleEvent>();
        const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
        const getLifecycle = jest.fn(async () => TaskStatus.Failed);

        const result = awaitTaskRunResult(id, events$, getLifecycle);

        events$.next(asTaskClaimEvent(id, asErr(new Error('failed to claim'))));

        await expect(result).rejects.toEqual(new Error('failed to claim'));

        expect(getLifecycle).toHaveBeenCalledWith(id);
      });

      test('ignores task run success of other tasks', () => {
        const events$ = new Subject<TaskLifecycleEvent>();
        const id = '01ddff11-e88a-4d13-bc4e-256164e755e2';
        const differentTask = '4bebf429-181b-4518-bb7d-b4246d8a35f0';
        const getLifecycle = jest.fn();

        const result = awaitTaskRunResult(id, events$, getLifecycle);

        const task = { id } as ConcreteTaskInstance;
        const otherTask = { id: differentTask } as ConcreteTaskInstance;
        events$.next(asTaskClaimEvent(id, asOk(task)));
        events$.next(asTaskClaimEvent(differentTask, asOk(otherTask)));

        events$.next(asTaskRunEvent(differentTask, asOk(task)));

        events$.next(asTaskRunEvent(id, asErr(new Error('some thing gone wrong'))));

        return expect(result).rejects.toEqual(new Error('some thing gone wrong'));
      });
    });
  });

  describe('claimAvailableTasks', () => {
    test('should claim Available Tasks when there are available workers', () => {
      const logger = mockLogger();
      const claim = jest.fn(() => Promise.resolve({ docs: [], claimedTasks: 0 }));

      const availableWorkers = 1;

      claimAvailableTasks([], claim, availableWorkers, logger);

      expect(claim).toHaveBeenCalledTimes(1);
    });

    test('should not claim Available Tasks when there are no available workers', () => {
      const logger = mockLogger();
      const claim = jest.fn(() => Promise.resolve({ docs: [], claimedTasks: 0 }));

      const availableWorkers = 0;

      claimAvailableTasks([], claim, availableWorkers, logger);

      expect(claim).not.toHaveBeenCalled();
    });

    /**
     * This handles the case in which Elasticsearch has had inline script disabled.
     * This is achieved by setting the `script.allowed_types` flag on Elasticsearch to `none`
     */
    test('handles failure due to inline scripts being disabled', () => {
      const logger = mockLogger();
      const claim = jest.fn(() => {
        throw Object.assign(new Error(), {
          msg: '[illegal_argument_exception] cannot execute [inline] scripts',
          path: '/.kibana_task_manager/_update_by_query',
          query: {
            ignore_unavailable: true,
            refresh: true,
            max_docs: 200,
            conflicts: 'proceed',
          },
          body:
            '{"query":{"bool":{"must":[{"term":{"type":"task"}},{"bool":{"must":[{"bool":{"should":[{"bool":{"must":[{"term":{"task.status":"idle"}},{"range":{"task.runAt":{"lte":"now"}}}]}},{"bool":{"must":[{"bool":{"should":[{"term":{"task.status":"running"}},{"term":{"task.status":"claiming"}}]}},{"range":{"task.retryAt":{"lte":"now"}}}]}}]}},{"bool":{"should":[{"exists":{"field":"task.interval"}},{"bool":{"must":[{"term":{"task.taskType":"vis_telemetry"}},{"range":{"task.attempts":{"lt":3}}}]}},{"bool":{"must":[{"term":{"task.taskType":"lens_telemetry"}},{"range":{"task.attempts":{"lt":3}}}]}},{"bool":{"must":[{"term":{"task.taskType":"actions:.server-log"}},{"range":{"task.attempts":{"lt":1}}}]}},{"bool":{"must":[{"term":{"task.taskType":"actions:.slack"}},{"range":{"task.attempts":{"lt":1}}}]}},{"bool":{"must":[{"term":{"task.taskType":"actions:.email"}},{"range":{"task.attempts":{"lt":1}}}]}},{"bool":{"must":[{"term":{"task.taskType":"actions:.index"}},{"range":{"task.attempts":{"lt":1}}}]}},{"bool":{"must":[{"term":{"task.taskType":"actions:.pagerduty"}},{"range":{"task.attempts":{"lt":1}}}]}},{"bool":{"must":[{"term":{"task.taskType":"actions:.webhook"}},{"range":{"task.attempts":{"lt":1}}}]}}]}}]}}]}},"sort":{"_script":{"type":"number","order":"asc","script":{"lang":"expression","source":"doc[\'task.retryAt\'].value || doc[\'task.runAt\'].value"}}},"seq_no_primary_term":true,"script":{"source":"ctx._source.task.ownerId=params.ownerId; ctx._source.task.status=params.status; ctx._source.task.retryAt=params.retryAt;","lang":"painless","params":{"ownerId":"kibana:5b2de169-2785-441b-ae8c-186a1936b17d","retryAt":"2019-10-31T13:35:43.579Z","status":"claiming"}}}',
          statusCode: 400,
          response:
            '{"error":{"root_cause":[{"type":"illegal_argument_exception","reason":"cannot execute [inline] scripts"}],"type":"search_phase_execution_exception","reason":"all shards failed","phase":"query","grouped":true,"failed_shards":[{"shard":0,"index":".kibana_task_manager_1","node":"24A4QbjHSK6prvtopAKLKw","reason":{"type":"illegal_argument_exception","reason":"cannot execute [inline] scripts"}}],"caused_by":{"type":"illegal_argument_exception","reason":"cannot execute [inline] scripts","caused_by":{"type":"illegal_argument_exception","reason":"cannot execute [inline] scripts"}}},"status":400}',
        });
      });

      claimAvailableTasks([], claim, 10, logger);

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn.mock.calls[0][0]).toMatchInlineSnapshot(
        `"Task Manager cannot operate when inline scripts are disabled in Elasticsearch"`
      );
    });
  });
});
