/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import { schema } from '@kbn/config-schema';
import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import type { TaskClaimingOpts } from '../queries/task_claiming';
import { TaskStatus } from '../task';
import { TaskManagerPlugin, type TaskManagerStartContract } from '../plugin';
import { injectTask, setupTestServers, retry } from './lib';
import { setupKibanaServer } from './lib/setup_test_servers';

// Long enough that a "nudged" claim (near-immediate) is clearly distinguishable from a claim
// that had to wait for the next regular poll cycle, even accounting for scheduling jitter on a
// busy CI/dev machine running a full multi-plugin Kibana boot.
const POLLING_INTERVAL = 20000;
// Generous, but still well under half of POLLING_INTERVAL: a claim nudge should land in low
// hundreds of ms in a healthy environment; this only needs to rule out "had to wait for the
// next regular poll cycle".
const NUDGE_RETRY_OPTS = { times: 100, intervalMs: 100 };

const mockTaskTypeRunFn = jest.fn();
const mockCreateTaskRunner = jest.fn();
const mockTaskType = {
  title: '',
  description: '',
  stateSchemaByVersion: {
    1: {
      up: (state: Record<string, unknown>) => ({ foo: state.foo || '' }),
      schema: schema.object({
        foo: schema.string(),
      }),
    },
  },
  createTaskRunner: mockCreateTaskRunner.mockImplementation(() => ({
    run: mockTaskTypeRunFn,
  })),
};

jest.mock('../queries/task_claiming', () => {
  const actual = jest.requireActual('../queries/task_claiming');
  return {
    ...actual,
    TaskClaiming: jest.fn().mockImplementation((opts: TaskClaimingOpts) => {
      // We need to register here because once the class is instantiated, adding
      // definitions won't get claimed because of "partitionIntoClaimingBatches".
      opts.definitions.registerTaskDefinitions({
        _claimNudgeTestType: mockTaskType,
      });
      return new actual.TaskClaiming(opts);
    }),
  };
});

const taskManagerStartSpy = jest.spyOn(TaskManagerPlugin.prototype, 'start');

function injectFutureTask(esClient: Parameters<typeof injectTask>[0], id: string) {
  return injectTask(esClient, {
    id,
    taskType: '_claimNudgeTestType',
    params: {},
    state: { foo: 'test' },
    stateVersion: 1,
    // far enough in the future that regular polling would never claim it on its own; only a
    // `runSoon` (which sets `runAt` back to "now") should make it eligible to be claimed.
    runAt: new Date(Date.now() + 60 * 60 * 1000),
    enabled: true,
    scheduledAt: new Date(),
    attempts: 0,
    status: TaskStatus.Idle,
    startedAt: null,
    retryAt: null,
    ownerId: null,
  });
}

function latestStartContract(): TaskManagerStartContract {
  const lastResult = taskManagerStartSpy.mock.results[taskManagerStartSpy.mock.results.length - 1];
  return lastResult.value as TaskManagerStartContract;
}

// One-off tasks self-clean once they successfully run, but if an assertion in this test throws
// before that happens, remove the task doc anyway so it can't leak into (and get claimed by) the
// next scenario, which reuses the same underlying ES cluster.
async function cleanupTask(taskManagerPlugin: TaskManagerStartContract, id: string) {
  try {
    await taskManagerPlugin.removeIfExists(id);
  } catch (e) {
    // best-effort cleanup only
  }
}

// A single ES server is shared across all scenarios (re-created Kibana instances point at it,
// mirroring the pattern used in `task_manager_switch_task_claimers.test.ts`) so this suite only
// pays the (slow) ES startup cost once, while still exercising fresh plugin configs per scenario.
describe('claim nudge', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  it('claims a runSoon task almost immediately instead of waiting for the next poll interval', async () => {
    const setupResult = await setupTestServers({
      xpack: {
        task_manager: {
          claim_strategy: 'mget',
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
    const taskManagerPlugin = latestStartContract();

    mockTaskTypeRunFn.mockImplementation(() => ({ state: {} }));

    const id = uuidV4();
    await injectFutureTask(kibanaServer.coreStart.elasticsearch.client.asInternalUser, id);

    const before = Date.now();
    await taskManagerPlugin.runSoon(id);

    try {
      await retry(
        async () => {
          expect(mockTaskTypeRunFn).toHaveBeenCalledTimes(1);
        },
        // much tighter than POLLING_INTERVAL: only passes if the claim nudge (rather than the
        // regular poll cycle) triggered the claim
        NUDGE_RETRY_OPTS
      );
      const elapsedMs = Date.now() - before;

      expect(elapsedMs).toBeLessThan(POLLING_INTERVAL / 2);
    } finally {
      await cleanupTask(taskManagerPlugin, id);
    }
  });

  it('claims a scheduled task almost immediately when requestImmediateClaim is set', async () => {
    await kibanaServer.stop();
    const setupResult = await setupKibanaServer({
      xpack: {
        task_manager: {
          claim_strategy: 'mget',
          poll_interval: POLLING_INTERVAL,
          unsafe: {
            exclude_task_types: ['[A-Za-z]*'],
          },
        },
      },
    });
    kibanaServer = setupResult.kibanaServer;

    // `beforeEach` clears the spy's call history, so within this test `start()` has only
    // been called once (for the freshly re-created Kibana root above).
    expect(taskManagerStartSpy).toHaveBeenCalledTimes(1);
    const taskManagerPlugin = latestStartContract();

    mockTaskTypeRunFn.mockImplementation(() => ({ state: {} }));

    const id = uuidV4();
    const before = Date.now();
    await taskManagerPlugin.schedule(
      {
        id,
        taskType: '_claimNudgeTestType',
        params: {},
        state: { foo: 'test' },
      },
      { requestImmediateClaim: true }
    );

    try {
      await retry(async () => {
        expect(mockTaskTypeRunFn).toHaveBeenCalledTimes(1);
      }, NUDGE_RETRY_OPTS);
      const elapsedMs = Date.now() - before;

      expect(elapsedMs).toBeLessThan(POLLING_INTERVAL / 2);
    } finally {
      await cleanupTask(taskManagerPlugin, id);
    }
  });

  it('a schedule() call without requestImmediateClaim relies on regular polling (no nudge)', async () => {
    await kibanaServer.stop();
    const setupResult = await setupKibanaServer({
      xpack: {
        task_manager: {
          claim_strategy: 'mget',
          poll_interval: 1000,
          unsafe: {
            exclude_task_types: ['[A-Za-z]*'],
          },
        },
      },
    });
    kibanaServer = setupResult.kibanaServer;

    expect(taskManagerStartSpy).toHaveBeenCalledTimes(1);
    const taskManagerPlugin = latestStartContract();

    mockTaskTypeRunFn.mockImplementation(() => ({ state: {} }));

    const id = uuidV4();
    await taskManagerPlugin.schedule({
      id,
      taskType: '_claimNudgeTestType',
      params: {},
      state: { foo: 'test' },
    });

    try {
      await retry(async () => {
        expect(mockTaskTypeRunFn).toHaveBeenCalledTimes(1);
      });
    } finally {
      await cleanupTask(taskManagerPlugin, id);
    }
  });

  it('still claims a runSoon task (via regular polling) when claim_nudge.enabled is false', async () => {
    await kibanaServer.stop();
    const setupResult = await setupKibanaServer({
      xpack: {
        task_manager: {
          claim_strategy: 'mget',
          poll_interval: 1000,
          claim_nudge: {
            enabled: false,
          },
          unsafe: {
            exclude_task_types: ['[A-Za-z]*'],
          },
        },
      },
    });
    kibanaServer = setupResult.kibanaServer;

    expect(taskManagerStartSpy).toHaveBeenCalledTimes(1);
    const taskManagerPlugin = latestStartContract();

    mockTaskTypeRunFn.mockImplementation(() => ({ state: {} }));

    const id = uuidV4();
    await injectFutureTask(kibanaServer.coreStart.elasticsearch.client.asInternalUser, id);

    await taskManagerPlugin.runSoon(id);

    try {
      await retry(async () => {
        expect(mockTaskTypeRunFn).toHaveBeenCalledTimes(1);
      });
    } finally {
      await cleanupTask(taskManagerPlugin, id);
    }
  });
});
