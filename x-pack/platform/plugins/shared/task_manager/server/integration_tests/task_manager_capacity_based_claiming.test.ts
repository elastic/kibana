/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import { schema } from '@kbn/config-schema';
import { times } from 'lodash';
import { TaskCost, TaskStatus } from '../task';
import type { TaskClaimingOpts } from '../queries/task_claiming';
import { TaskManagerPlugin, type TaskManagerStartContract } from '../plugin';
import { injectTaskBulk, setupTestServers, retry } from './lib';
import { CreateMonitoringStatsOpts } from '../monitoring';
import { filter, map } from 'rxjs';
import { isTaskManagerWorkerUtilizationStatEvent } from '../task_events';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import { Ok } from '../lib/result_type';

const POLLING_INTERVAL = 5000;
const { TaskPollingLifecycle: TaskPollingLifecycleMock } = jest.requireMock('../polling_lifecycle');
jest.mock('../polling_lifecycle', () => {
  const actual = jest.requireActual('../polling_lifecycle');
  return {
    ...actual,
    TaskPollingLifecycle: jest.fn().mockImplementation((opts) => {
      return new actual.TaskPollingLifecycle(opts);
    }),
  };
});

const { createMonitoringStats: createMonitoringStatsMock } = jest.requireMock('../monitoring');
jest.mock('../monitoring', () => {
  const actual = jest.requireActual('../monitoring');
  return {
    ...actual,
    createMonitoringStats: jest.fn().mockImplementation((opts) => {
      return new actual.createMonitoringStats(opts);
    }),
  };
});

const mockTaskTypeNormalCostRunFn = jest.fn();
const mockCreateTaskRunnerNormalCost = jest.fn();
const mockTaskTypeNormalCost = {
  title: 'Normal cost task',
  description: '',
  cost: TaskCost.Normal,
  stateSchemaByVersion: {
    1: {
      up: (state: Record<string, unknown>) => ({ foo: state.foo || '' }),
      schema: schema.object({
        foo: schema.string(),
      }),
    },
  },
  createTaskRunner: mockCreateTaskRunnerNormalCost.mockImplementation(() => ({
    run: mockTaskTypeNormalCostRunFn,
  })),
};
const mockTaskTypeXLCostRunFn = jest.fn();
const mockCreateTaskRunnerXLCost = jest.fn();
const mockTaskTypeXLCost = {
  title: 'XL cost task',
  description: '',
  cost: TaskCost.ExtraLarge,
  stateSchemaByVersion: {
    1: {
      up: (state: Record<string, unknown>) => ({ foo: state.foo || '' }),
      schema: schema.object({
        foo: schema.string(),
      }),
    },
  },
  createTaskRunner: mockCreateTaskRunnerXLCost.mockImplementation(() => ({
    run: mockTaskTypeXLCostRunFn,
  })),
};
jest.mock('../queries/task_claiming', () => {
  const actual = jest.requireActual('../queries/task_claiming');
  return {
    ...actual,
    TaskClaiming: jest.fn().mockImplementation((opts: TaskClaimingOpts) => {
      opts.definitions.registerTaskDefinitions({
        _normalCostType: mockTaskTypeNormalCost,
        _xlCostType: mockTaskTypeXLCost,
      });
      return new actual.TaskClaiming(opts);
    }),
  };
});

const taskManagerStartSpy = jest.spyOn(TaskManagerPlugin.prototype, 'start');

describe('capacity based claiming', () => {
  const taskIdsToRemove: string[] = [];
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let taskManagerPlugin: TaskManagerStartContract;
  let createMonitoringStatsOpts: CreateMonitoringStatsOpts;

  beforeAll(async () => {
    const setupResult = await setupTestServers({
      xpack: {
        task_manager: {
          claim_strategy: `mget`,
          capacity: 10,
          poll_interval: POLLING_INTERVAL,
          unsafe: {
            exclude_task_types: ['[A-Za-z]*'],
          },
        },
      },
    });
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;

    expect(taskManagerStartSpy).toHaveBeenCalledTimes(1);
    taskManagerPlugin = taskManagerStartSpy.mock.results[0].value;

    expect(TaskPollingLifecycleMock).toHaveBeenCalledTimes(1);

    expect(createMonitoringStatsMock).toHaveBeenCalledTimes(1);
    createMonitoringStatsOpts = createMonitoringStatsMock.mock.calls[0][0];
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    while (taskIdsToRemove.length > 0) {
      const id = taskIdsToRemove.pop();
      await taskManagerPlugin.removeIfExists(id!);
    }
  });

  it('should claim tasks to full capacity', async () => {
    const backgroundTaskLoads: number[] = [];
    createMonitoringStatsOpts.taskPollingLifecycle?.events
      .pipe(
        filter(isTaskManagerWorkerUtilizationStatEvent),
        map<TaskLifecycleEvent, number>((taskEvent: TaskLifecycleEvent) => {
          return (taskEvent.event as unknown as Ok<number>).value;
        })
      )
      .subscribe((load: number) => {
        backgroundTaskLoads.push(load);
      });
    const taskRunAtDates: Date[] = [];
    mockTaskTypeNormalCostRunFn.mockImplementation(() => {
      taskRunAtDates.push(new Date());
      return { state: { foo: 'test' } };
    });

    // inject 10 normal cost tasks with the same runAt value
    const ids: string[] = [];
    times(10, () => ids.push(uuidV4()));

    const now = new Date();
    const runAt = new Date(now.valueOf() + 6000);
    const tasks = [];
    for (const id of ids) {
      tasks.push({
        id,
        taskType: '_normalCostType',
        params: {},
        state: { foo: 'test' },
        stateVersion: 1,
        runAt,
        enabled: true,
        scheduledAt: new Date(),
        attempts: 0,
        status: TaskStatus.Idle,
        startedAt: null,
        retryAt: null,
        ownerId: null,
      });
      taskIdsToRemove.push(id);
    }

    await injectTaskBulk(kibanaServer.coreStart.elasticsearch.client.asInternalUser, tasks);

    await retry(async () => {
      expect(mockTaskTypeNormalCostRunFn).toHaveBeenCalledTimes(10);
    });

    expect(taskRunAtDates.length).toBe(10);

    // run at dates should be within a few seconds of each other
    const firstRunAt = taskRunAtDates[0].getTime();
    const lastRunAt = taskRunAtDates[taskRunAtDates.length - 1].getTime();

    expect(lastRunAt - firstRunAt).toBeLessThanOrEqual(1000);

    // background task load should be 0 or 100 since we're only running these tasks
    for (const load of backgroundTaskLoads) {
      expect(load === 0 || load === 100).toBe(true);
    }
  });

  it('should claim tasks until the next task will exceed capacity', async () => {
    const backgroundTaskLoads: number[] = [];
    createMonitoringStatsOpts.taskPollingLifecycle?.events
      .pipe(
        filter(isTaskManagerWorkerUtilizationStatEvent),
        map<TaskLifecycleEvent, number>((taskEvent: TaskLifecycleEvent) => {
          return (taskEvent.event as unknown as Ok<number>).value;
        })
      )
      .subscribe((load: number) => {
        backgroundTaskLoads.push(load);
      });
    const now = new Date();
    const taskRunAtDates: Array<{ runAt: Date; type: string }> = [];
    mockTaskTypeNormalCostRunFn.mockImplementation(() => {
      taskRunAtDates.push({ type: 'normal', runAt: new Date() });
      return { state: { foo: 'test' } };
    });
    mockTaskTypeXLCostRunFn.mockImplementation(() => {
      taskRunAtDates.push({ type: 'xl', runAt: new Date() });
      return { state: { foo: 'test' } };
    });

    // inject 6 normal cost tasks for total cost of 12
    const ids: string[] = [];
    times(6, () => ids.push(uuidV4()));
    const runAt1 = new Date(now.valueOf() - 5);
    const tasks = [];
    for (const id of ids) {
      tasks.push({
        id,
        taskType: '_normalCostType',
        params: {},
        state: { foo: 'test' },
        stateVersion: 1,
        runAt: runAt1,
        enabled: true,
        scheduledAt: new Date(),
        attempts: 0,
        status: TaskStatus.Idle,
        startedAt: null,
        retryAt: null,
        ownerId: null,
      });
      taskIdsToRemove.push(id);
    }

    // inject 1 XL cost task that will put us over the max cost capacity of 20
    const xlid = uuidV4();
    const runAt2 = now;
    tasks.push({
      id: xlid,
      taskType: '_xlCostType',
      params: {},
      state: { foo: 'test' },
      stateVersion: 1,
      runAt: runAt2,
      enabled: true,
      scheduledAt: new Date(),
      attempts: 0,
      status: TaskStatus.Idle,
      startedAt: null,
      retryAt: null,
      ownerId: null,
    });
    taskIdsToRemove.push(xlid);

    // inject one more normal cost task
    const runAt3 = new Date(now.valueOf() + 5);
    const lastid = uuidV4();
    tasks.push({
      id: lastid,
      taskType: '_normalCostType',
      params: {},
      state: { foo: 'test' },
      stateVersion: 1,
      runAt: runAt3,
      enabled: true,
      scheduledAt: new Date(),
      attempts: 0,
      status: TaskStatus.Idle,
      startedAt: null,
      retryAt: null,
      ownerId: null,
    });
    taskIdsToRemove.push(lastid);

    await injectTaskBulk(kibanaServer.coreStart.elasticsearch.client.asInternalUser, tasks);

    // retry until all tasks have been run
    await retry(async () => {
      expect(mockTaskTypeNormalCostRunFn).toHaveBeenCalledTimes(7);
      expect(mockTaskTypeXLCostRunFn).toHaveBeenCalledTimes(1);
    });

    expect(taskRunAtDates.length).toBe(8);

    const firstRunAt = taskRunAtDates[0].runAt.getTime();

    // the first 6 tasks should have been run at the same time (adding some fudge factor)
    // and they should all be normal cost tasks
    for (let i = 0; i < 6; i++) {
      expect(taskRunAtDates[i].type).toBe('normal');
      expect(taskRunAtDates[i].runAt.getTime() - firstRunAt).toBeLessThanOrEqual(500);
    }

    // the next task should be XL cost task and be run after one polling interval has passed (with some fudge factor)
    expect(taskRunAtDates[6].type).toBe('xl');
    expect(taskRunAtDates[6].runAt.getTime() - firstRunAt).toBeGreaterThan(POLLING_INTERVAL - 500);

    // last task should be normal cost and be run after one polling interval has passed
    expect(taskRunAtDates[7].type).toBe('normal');
    expect(taskRunAtDates[7].runAt.getTime() - firstRunAt).toBeGreaterThan(POLLING_INTERVAL - 500);

    // background task load should be 0 or 60 or 100 since we're only running these tasks
    // should be 100 during the claim cycle where we claimed 6 normal tasks but left the large capacity task in the queue
    // should be 60 during the next claim cycle where we claimed the large capacity task and the normal capacity: 10 + 2 / 20 = 60%
    for (const load of backgroundTaskLoads) {
      expect(load === 0 || load === 60 || load === 100).toBe(true);
    }
  });
});
