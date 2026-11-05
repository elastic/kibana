/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import type {
  ConcreteTaskInstance,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { throwRetryableError } from '@kbn/task-manager-plugin/server';
import { TaskManagerPlugin } from '@kbn/task-manager-plugin/server/plugin';
import type { TaskClaimingOpts } from '@kbn/task-manager-plugin/server/queries/task_claiming';
import { isNewAttempt, type RenderRetryState } from '../render_retry';

const mockTaskType = 'reporting:attempts-contract';
const mockRun = jest.fn();
const mockRuns: Array<Pick<ConcreteTaskInstance, 'attempts' | 'state'>> = [];

jest.mock('@kbn/task-manager-plugin/server/queries/task_claiming', () => {
  const actual = jest.requireActual('@kbn/task-manager-plugin/server/queries/task_claiming');
  return {
    ...actual,
    TaskClaiming: jest.fn().mockImplementation((opts: TaskClaimingOpts) => {
      // Task types registered after TaskClaiming is created are never claimed.
      opts.definitions.registerTaskDefinitions({
        [mockTaskType]: {
          title: 'Reporting attempt-counting contract',
          maxAttempts: 3,
          createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => ({
            run: async () => {
              mockRuns.push({ attempts: taskInstance.attempts, state: taskInstance.state });
              return mockRun();
            },
          }),
        },
      });
      return new actual.TaskClaiming(opts);
    }),
  };
});

const taskManagerStart = jest.spyOn(TaskManagerPlugin.prototype, 'start');

const waitFor = async (assertion: () => void, timeoutMs = 60_000) => {
  const giveUpAt = Date.now() + timeoutMs;
  for (;;) {
    try {
      return assertion();
    } catch (error) {
      if (Date.now() > giveUpAt) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
};

/**
 * `isNewAttempt` reads Task Manager's attempt count and task state, so it relies on Task Manager
 * restarting the count after a `{ runAt }` result and keeping state when a run throws.
 */
describe('Task Manager behavior that report attempt counting relies on', () => {
  let esServer: TestElasticsearchUtils;
  let root: ReturnType<typeof createRootWithCorePlugins>;
  let taskManager: TaskManagerStartContract;

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (timeout) => jest.setTimeout(timeout),
      settings: { es: { license: 'trial' } },
    });
    esServer = await startES();
    root = createRootWithCorePlugins({ logging: { root: { level: 'warn' } } }, { oss: false });
    await root.preboot();
    await root.setup();
    await root.start();
    taskManager = taskManagerStart.mock.results[0].value;
  });

  afterAll(async () => {
    await root?.shutdown();
    await esServer?.stop();
  });

  it('counts a hand-back as no attempt, and a failure after it as one', async () => {
    mockRun
      // A hand-back while waiting for render capacity.
      .mockImplementationOnce(() => ({ runAt: new Date(), state: { queued: true } }))
      // An ordinary failure in the run after it.
      .mockImplementationOnce(() => throwRetryableError(new Error('boom'), new Date()))
      .mockImplementationOnce(() => ({ state: {} }));

    await taskManager.schedule({ taskType: mockTaskType, params: {}, state: {} });
    await waitFor(() => expect(mockRuns).toHaveLength(3));

    expect(mockRuns).toEqual([
      { attempts: 1, state: {} },
      { attempts: 1, state: { queued: true } },
      { attempts: 2, state: { queued: true } },
    ]);
    expect(
      mockRuns.map(({ attempts, state }) => isNewAttempt(state as RenderRetryState, attempts))
    ).toEqual([true, false, true]);
  });
});
