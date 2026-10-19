/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import { schema } from '@kbn/config-schema';
import {
  createTestServers,
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import type { createTaskPoller } from '../polling/task_poller';
import { TaskManagerClaimNudgeService } from '../claim_nudge/claim_nudge_service';
import type { TaskClaimingOpts } from '../queries/task_claiming';
import { TaskStatus } from '../task';
import { TaskManagerPlugin, type TaskManagerStartContract } from '../plugin';
import { injectTask, retry } from './lib';
import { setupKibanaServer } from './lib/setup_test_servers';

// Long enough to tell a nudged claim from a regular one despite CI jitter.
const POLLING_INTERVAL = 20000;
const NUDGE_RETRY_INTERVAL_MS = 100;
// A quarter of the poll interval, inside the `POLLING_INTERVAL / 2` assertion below.
const NUDGE_RETRY_OPTS = {
  times: POLLING_INTERVAL / 4 / NUDGE_RETRY_INTERVAL_MS,
  intervalMs: NUDGE_RETRY_INTERVAL_MS,
};

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
      // Definitions added after instantiation aren't claimed ("partitionIntoClaimingBatches").
      opts.definitions.registerTaskDefinitions({
        _claimNudgeTestType: mockTaskType,
      });
      return new actual.TaskClaiming(opts);
    }),
  };
});

const mockCompletedCycles: Array<{ startedAt: number; finishedAt: number }> = [];
jest.mock('../polling/task_poller', () => {
  const actual = jest.requireActual('../polling/task_poller');
  return {
    ...actual,
    createTaskPoller: (opts: Parameters<typeof createTaskPoller>[0]) =>
      actual.createTaskPoller({
        ...opts,
        work: async () => {
          const startedAt = Date.now();
          const result = await opts.work();
          mockCompletedCycles.push({ startedAt, finishedAt: Date.now() });
          return result;
        },
      }),
  };
});

const nudgeStartSpy = jest.spyOn(TaskManagerClaimNudgeService.prototype, 'start');
const notifySpy = jest.spyOn(TaskManagerClaimNudgeService.prototype, 'notify');
const taskManagerStartSpy = jest.spyOn(TaskManagerPlugin.prototype, 'start');

function injectFutureTask(esClient: Parameters<typeof injectTask>[0], id: string) {
  return injectTask(esClient, {
    id,
    taskType: '_claimNudgeTestType',
    params: {},
    state: { foo: 'test' },
    stateVersion: 1,
    // an hour out so regular polling can never claim it; only a `runSoon` can make it eligible
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

// A failed assertion can leave the task behind for the next scenario on the shared cluster.
async function cleanupTask(taskManagerPlugin: TaskManagerStartContract, id: string) {
  try {
    await taskManagerPlugin.removeIfExists(id);
  } catch (e) {
    // best-effort cleanup only
  }
}

// One ES server is shared across scenarios to pay its startup cost once.
describe('claim nudge', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let uiServer: TestKibanaUtils | undefined;

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (timeout) => jest.setTimeout(timeout),
      settings: { es: { license: 'trial' } },
    });
    esServer = await startES();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCompletedCycles.length = 0;
  });

  async function startKibanaWith(taskManager: Record<string, unknown>, backgroundOnly = false) {
    const settings = {
      server: { uuid: uuidV4() },
      node: { roles: backgroundOnly ? ['background_tasks'] : ['ui', 'background_tasks'] },
      xpack: { task_manager: taskManager },
    };

    if (kibanaServer) {
      await kibanaServer.stop();
    }
    ({ kibanaServer } = await setupKibanaServer(settings));

    // `beforeEach` clears the spy, so this counts only the Kibana root created above.
    expect(taskManagerStartSpy).toHaveBeenCalledTimes(1);
    return latestStartContract();
  }

  afterEach(async () => {
    await uiServer?.stop();
    uiServer = undefined;
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  it.each([false, true])(
    'claims before the regular deadline (UI-only sender: %s)',
    async (uiOnlySender) => {
      const taskManagerConfig = {
        claim_strategy: 'mget',
        poll_interval: POLLING_INTERVAL,
        unsafe: { exclude_task_types: ['[A-Za-z]*'] },
      };
      const receiver = await startKibanaWith(taskManagerConfig, uiOnlySender);
      let sender = receiver;
      if (uiOnlySender) {
        ({ kibanaServer: uiServer } = await setupKibanaServer({
          server: { uuid: uuidV4() },
          node: { roles: ['ui'] },
          xpack: { task_manager: taskManagerConfig },
        }));
        sender = latestStartContract();
        expect(sender).not.toBe(receiver);
      }
      // A UI-only sender must not claim locally or start its own checkpoint watcher.
      expect(nudgeStartSpy).toHaveBeenCalledTimes(1);
      const watcher: TaskManagerClaimNudgeService = nudgeStartSpy.mock.contexts[0];
      const receivedNudges: number[] = [];
      const subscription = watcher.claimNudge$.subscribe(() => receivedNudges.push(Date.now()));
      mockTaskTypeRunFn.mockImplementation(() => ({ state: {} }));
      const esClient = kibanaServer.coreStart.elasticsearch.client.asInternalUser;
      const primingId = uuidV4();
      const id = uuidV4();
      try {
        await injectFutureTask(esClient, primingId);
        await sender.runSoon(primingId, { requestImmediateClaim: true });
        // runSoon doesn't await delivery; await it here so it can't throttle the measured nudge.
        await notifySpy.mock.results[0].value;
        const primedAt = Date.now();
        await injectFutureTask(esClient, id);

        // Sync to the poller's phase: wait for a regular cycle one interval after the last nudge.
        await retry(
          async () => {
            const cycle = mockCompletedCycles[mockCompletedCycles.length - 1];
            const lastNudge = receivedNudges[receivedNudges.length - 1] ?? primedAt;
            expect(cycle.startedAt).toBeGreaterThanOrEqual(
              Math.max(primedAt, lastNudge) + POLLING_INTERVAL
            );
            expect(Date.now() - cycle.startedAt).toBeLessThan(2000);
          },
          { times: (POLLING_INTERVAL * 3) / 100, intervalMs: 100 }
        );
        const regularCycle = mockCompletedCycles[mockCompletedCycles.length - 1];
        const before = Date.now();
        await sender.runSoon(id, { requestImmediateClaim: true });
        await retry(async () => {
          expect(mockCreateTaskRunner).toHaveBeenCalledWith(
            expect.objectContaining({
              taskInstance: expect.objectContaining({ id }),
            })
          );
        }, NUDGE_RETRY_OPTS);
        expect(receivedNudges.some((receivedAt) => receivedAt >= before)).toBe(true);
        expect(Date.now() - before).toBeLessThan(POLLING_INTERVAL / 2);
        expect(Date.now()).toBeLessThan(regularCycle.startedAt + POLLING_INTERVAL);
      } finally {
        subscription.unsubscribe();
        await cleanupTask(sender, primingId);
        await cleanupTask(sender, id);
      }
    }
  );

  // That schedule() never nudges is covered by the 'does not notify the claim nudge' unit test.
  it('still runs a schedule() task', async () => {
    const taskManagerPlugin = await startKibanaWith({
      claim_strategy: 'mget',
      poll_interval: 1000,
      unsafe: {
        exclude_task_types: ['[A-Za-z]*'],
      },
    });

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

  it.each(['disabled', 'failed'])(
    'falls back to regular polling when signaling is %s',
    async (signaling) => {
      const taskManagerPlugin = await startKibanaWith({
        claim_strategy: 'mget',
        poll_interval: 1000,
        claim_nudge: {
          enabled: signaling !== 'disabled',
        },
        unsafe: {
          exclude_task_types: ['[A-Za-z]*'],
        },
      });

      mockTaskTypeRunFn.mockImplementation(() => ({ state: {} }));

      const id = uuidV4();
      await injectFutureTask(kibanaServer.coreStart.elasticsearch.client.asInternalUser, id);

      if (signaling === 'failed') {
        notifySpy.mockRejectedValueOnce(new Error('signal unavailable'));
      }
      await taskManagerPlugin.runSoon(id, { requestImmediateClaim: true });

      try {
        await retry(async () => {
          expect(mockTaskTypeRunFn).toHaveBeenCalledTimes(1);
        });
      } finally {
        await cleanupTask(taskManagerPlugin, id);
      }
    }
  );
});
