/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import { times } from 'lodash';
import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import { schema } from '@kbn/config-schema';
import { TaskStatus, type RunContext } from '../task';
import type { TaskClaimingOpts } from '../queries/task_claiming';
import { TaskManagerPlugin, type TaskManagerStartContract } from '../plugin';
import { TaskStore } from '../task_store';
import { injectTaskBulk, setupTestServers, retry } from './lib';

// Minimum allowed capacity (see MIN_CAPACITY in config.ts). Normal-cost tasks consume 2
// capacity each, so at most 2 are claimed per cycle — well below the number of candidates.
const CAPACITY = 5;
const POLLING_INTERVAL = 500;
const TASK_TYPE = '_winnersOnlyType';

// The mget claimer over-fetches candidates (4 * capacity) but should only ever hydrate and
// decrypt the tasks it actually claims. The candidate search excludes the apiKey fields from
// _source, so the candidate-path decryption sees no key and no-ops; the only real decryption
// happens when the claimed winners are re-fetched in full via TaskStore.bulkGet. We spy on the
// private bulkGetDecryptedTaskApiKeys and assert it is never handed more ids than the capacity
// in a single claim cycle.
const decryptSpy = jest.spyOn(
  TaskStore.prototype as unknown as {
    bulkGetDecryptedTaskApiKeys: (taskIds: string[]) => Promise<Map<string, unknown>>;
  },
  'bulkGetDecryptedTaskApiKeys'
);

const mockRunFn = jest.fn();
const mockCreateTaskRunner = jest.fn();
const mockTaskType = {
  title: 'Winners only decryption test task',
  description: '',
  timeout: '1m',
  maxAttempts: 1,
  stateSchemaByVersion: {
    1: {
      up: (state: Record<string, unknown>) => ({ foo: state.foo || '' }),
      schema: schema.object({
        foo: schema.string(),
      }),
    },
  },
  createTaskRunner: mockCreateTaskRunner.mockImplementation(({ taskInstance }: RunContext) => ({
    run: async () => mockRunFn(taskInstance),
  })),
};

jest.mock('../queries/task_claiming', () => {
  const actual = jest.requireActual('../queries/task_claiming');
  return {
    ...actual,
    TaskClaiming: jest.fn().mockImplementation((opts: TaskClaimingOpts) => {
      opts.definitions.registerTaskDefinitions({ [TASK_TYPE]: mockTaskType });
      return new actual.TaskClaiming(opts);
    }),
  };
});

const taskManagerStartSpy = jest.spyOn(TaskManagerPlugin.prototype, 'start');

describe('Task claiming decrypts and hydrates claimed winners only (integration)', () => {
  const taskIdsToRemove: string[] = [];
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let taskManagerPlugin: TaskManagerStartContract;

  beforeAll(async () => {
    const setupResult = await setupTestServers({
      xpack: {
        task_manager: {
          claim_strategy: `mget`,
          capacity: CAPACITY,
          poll_interval: POLLING_INTERVAL,
          // Exclude every other registered task type so only our injected tasks are claimed,
          // keeping the decryption call counts deterministic.
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
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  afterEach(async () => {
    while (taskIdsToRemove.length > 0) {
      const id = taskIdsToRemove.pop();
      await taskManagerPlugin.removeIfExists(id!);
    }
  });

  it('decrypts at most "capacity" tasks per claim cycle even when more candidates exist', async () => {
    decryptSpy.mockClear();
    mockRunFn.mockClear();

    // Inject many more tasks than can be claimed in a single cycle, each carrying its own
    // API key + userScope and a sentinel in state. With the old candidate-path decryption a
    // single call would have received up to `taskCount` ids.
    const taskCount = 15;
    const ids: string[] = [];
    times(taskCount, () => ids.push(uuidV4()));

    const runAt = new Date(Date.now() - 1000);
    const tasks = ids.map((id) => ({
      id,
      taskType: TASK_TYPE,
      params: {},
      state: { foo: id },
      stateVersion: 1,
      runAt,
      enabled: true,
      scheduledAt: new Date(),
      attempts: 0,
      status: TaskStatus.Idle,
      startedAt: null,
      retryAt: null,
      ownerId: null,
      apiKey: Buffer.from(`${id}:api-key-value`).toString('base64'),
      userScope: {
        apiKeyId: id,
        spaceId: 'default',
        apiKeyCreatedByUser: false,
      },
    }));
    taskIdsToRemove.push(...ids);

    await injectTaskBulk(kibanaServer.coreStart.elasticsearch.client.asInternalUser, tasks);

    // Wait until every task has run (across multiple claim cycles).
    await retry(async () => {
      expect(mockRunFn).toHaveBeenCalledTimes(taskCount);
    });

    // The decryption helper is only reachable through the claimed-winners bulkGet, so no
    // single invocation should ever see more ids than the per-cycle capacity. If decryption
    // had stayed in the candidate search path, a call would have received up to `taskCount`.
    expect(decryptSpy).toHaveBeenCalled();
    for (const call of decryptSpy.mock.calls) {
      const [taskIds] = call;
      expect(taskIds.length).toBeLessThanOrEqual(CAPACITY);
    }

    // Each claimed task is hydrated in full: the runner receives the sentinel state that the
    // slim candidate search excludes.
    for (const call of mockRunFn.mock.calls) {
      const [taskInstance] = call;
      expect(taskInstance.state).toEqual({ foo: taskInstance.id });
    }
  });
});
