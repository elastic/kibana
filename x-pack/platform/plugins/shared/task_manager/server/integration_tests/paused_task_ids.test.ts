/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import type { ConcreteTaskInstance } from '../task';
import { TaskStatus } from '../task';
import type { TaskClaimingOpts } from '../queries/task_claiming';
import { TaskManagerPlugin, type TaskManagerStartContract } from '../plugin';
import { injectTaskBulk, setupTestServers, retry } from './lib';

const POLLING_INTERVAL = 1000;
const TASK_TYPE = '_pausedTaskIdsType';
const PAUSED_TASK_ID = uuidV4();

const ranTaskIds: string[] = [];
const taskType = {
  title: 'Paused task ids test task',
  description: '',
  createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => ({
    run: async () => {
      ranTaskIds.push(taskInstance.id);
      return { state: {} };
    },
  }),
};

jest.mock('../queries/task_claiming', () => {
  const actual = jest.requireActual('../queries/task_claiming');
  return {
    ...actual,
    TaskClaiming: jest.fn().mockImplementation((opts: TaskClaimingOpts) => {
      opts.definitions.registerTaskDefinitions({ [TASK_TYPE]: taskType });
      return new actual.TaskClaiming(opts);
    }),
  };
});

const taskManagerStartSpy = jest.spyOn(TaskManagerPlugin.prototype, 'start');

const createTask = (id: string): ConcreteTaskInstance => ({
  id,
  taskType: TASK_TYPE,
  params: {},
  state: {},
  runAt: new Date(),
  enabled: true,
  scheduledAt: new Date(),
  attempts: 0,
  status: TaskStatus.Idle,
  startedAt: null,
  retryAt: null,
  ownerId: null,
});

describe('paused task ids', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let taskManagerPlugin: TaskManagerStartContract;

  beforeAll(async () => {
    const setupResult = await setupTestServers({
      xpack: {
        // This test finishes before the SLO plugin's startup resource installer does;
        // disabled so it does not keep retrying (and logging) after the servers stop.
        slo: { enabled: false },
        task_manager: {
          poll_interval: POLLING_INTERVAL,
          execution_control: {
            paused_task_ids: [PAUSED_TASK_ID],
          },
          unsafe: {
            // keep every other task type out of the way
            exclude_task_types: ['[A-Za-z]*'],
          },
        },
      },
    });
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;

    expect(taskManagerStartSpy).toHaveBeenCalledTimes(1);
    taskManagerPlugin = taskManagerStartSpy.mock.results[0].value;
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  it('never claims a task whose id is paused by configuration, while other tasks of the same type run', async () => {
    const otherTaskId = uuidV4();
    await injectTaskBulk(kibanaServer.coreStart.elasticsearch.client.asInternalUser, [
      createTask(PAUSED_TASK_ID),
      createTask(otherTaskId),
    ]);

    await retry(async () => {
      expect(ranTaskIds).toContain(otherTaskId);
    });

    // give the paused task several more claim cycles to (wrongly) get picked up
    await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL * 5));

    expect(ranTaskIds).not.toContain(PAUSED_TASK_ID);
    const pausedTask = await taskManagerPlugin.get(PAUSED_TASK_ID);
    expect(pausedTask.status).toBe(TaskStatus.Idle);
    expect(pausedTask.attempts).toBe(0);
  });
});
