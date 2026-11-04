/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { taskStoreMock } from '../task_store.mock';
import { taskSchedulingMock } from '../task_scheduling.mock';
import { mockLogger } from '../test_utils';
import type { ConcreteTaskInstance } from '../task';
import { TaskStatus } from '../task';
import {
  getChildTaskId,
  getChildTaskOutcome,
  MAX_CHILDREN_PER_PARENT,
  MAX_FAN_OUT_DEPTH,
  summarizeChildren,
  TaskFanOutService,
  toChildTaskView,
} from './fan_out';

const task = (overrides: Partial<ConcreteTaskInstance> = {}): ConcreteTaskInstance => ({
  id: 'parent',
  taskType: 'parentType',
  scheduledAt: new Date(),
  runAt: new Date(),
  startedAt: new Date(),
  retryAt: null,
  attempts: 0,
  params: {},
  state: {},
  status: TaskStatus.Running,
  ownerId: 'node-1',
  scope: ['testing'],
  ...overrides,
});

const child = (key: string, overrides: Partial<ConcreteTaskInstance> = {}): ConcreteTaskInstance =>
  task({
    id: getChildTaskId('parent', key),
    taskType: 'childType',
    parentId: 'parent',
    rootId: 'parent',
    depth: 1,
    childKey: key,
    status: TaskStatus.Idle,
    startedAt: null,
    ownerId: null,
    ...overrides,
  });

describe('fan-out', () => {
  describe('getChildTaskOutcome', () => {
    test.each([
      [TaskStatus.Done, 'done'],
      [TaskStatus.Failed, 'failed'],
      [TaskStatus.DeadLetter, 'failed'],
      [TaskStatus.Cancelled, 'cancelled'],
      [TaskStatus.Unrecognized, 'unrecognized'],
      [TaskStatus.Idle, 'inProgress'],
      [TaskStatus.Claiming, 'inProgress'],
      [TaskStatus.Running, 'inProgress'],
      [TaskStatus.Waiting, 'inProgress'],
    ])('maps %s to %s', (status, outcome) => {
      expect(getChildTaskOutcome(status)).toBe(outcome);
    });
  });

  describe('toChildTaskView', () => {
    test('exposes the state of done and failed children only', () => {
      expect(toChildTaskView(child('a', { status: TaskStatus.Done, state: { r: 1 } }))).toEqual({
        id: 'parent:a',
        key: 'a',
        taskType: 'childType',
        outcome: 'done',
        status: TaskStatus.Done,
        attempts: 0,
        state: { r: 1 },
      });
      expect(
        toChildTaskView(child('b', { status: TaskStatus.Running, state: { partial: true } }))
      ).not.toHaveProperty('state');
    });
  });

  describe('summarizeChildren', () => {
    test('reports an expected key without a document as missing, never as done', () => {
      const summary = summarizeChildren(
        [
          toChildTaskView(child('a', { status: TaskStatus.Done })),
          toChildTaskView(child('b', { status: TaskStatus.Running })),
          toChildTaskView(child('c', { status: TaskStatus.Failed })),
          toChildTaskView(child('d', { status: TaskStatus.Cancelled })),
        ],
        ['a', 'b', 'c', 'd', 'e']
      );

      expect(summary).toMatchObject({
        expected: 5,
        inProgress: 1,
        done: 1,
        failed: 1,
        cancelled: 1,
        missing: 1,
        unrecognized: 0,
        settled: false,
      });
      expect(summary.children.map(({ key, outcome }) => [key, outcome])).toEqual([
        ['a', 'done'],
        ['b', 'inProgress'],
        ['c', 'failed'],
        ['d', 'cancelled'],
        ['e', 'missing'],
      ]);
    });

    test('is settled once no expected child is in progress, even with missing ones', () => {
      const summary = summarizeChildren(
        [toChildTaskView(child('a', { status: TaskStatus.Done }))],
        ['a', 'b']
      );
      expect(summary.settled).toBe(true);
      expect(summary.missing).toBe(1);
    });

    test('ignores children the parent does not expect', () => {
      const summary = summarizeChildren(
        [toChildTaskView(child('stale', { status: TaskStatus.Running }))],
        ['a']
      );
      expect(summary).toMatchObject({ expected: 1, inProgress: 0, missing: 1, settled: true });
    });
  });

  describe('TaskFanOutService', () => {
    const setup = () => {
      const store = taskStoreMock.create();
      const scheduling = taskSchedulingMock.create();
      scheduling.bulkSchedule.mockImplementation(async (instances) =>
        instances.map((instance) => task({ ...(instance as ConcreteTaskInstance) }))
      );
      store.search.mockResolvedValue({ docs: [], versionMap: new Map() });
      store.bulkPartialUpdate.mockResolvedValue([]);
      const claimNudgeService = { notify: jest.fn().mockResolvedValue(undefined) };
      const service = new TaskFanOutService({
        logger: mockLogger(),
        store,
        getScheduling: () => scheduling,
        claimNudgeService: claimNudgeService as never,
      });
      const onSpawned = jest.fn();
      const context = (parent = task(), fakeRequest?: ReturnType<typeof kibanaRequestFactory>) =>
        service.createContext(parent, { fakeRequest, onSpawned });
      return { store, scheduling, service, context, onSpawned, claimNudgeService };
    };

    describe('notifyParent', () => {
      test('makes a waiting parent claimable now and requests a claim cycle', async () => {
        const { store, service, claimNudgeService } = setup();
        store.bulkGetWithoutApiKeys.mockResolvedValue([task({ status: TaskStatus.Waiting })]);

        await expect(service.notifyParent(child('a'))).resolves.toBe('woken');

        expect(store.bulkPartialUpdate).toHaveBeenCalledWith([
          { id: 'parent', runAt: expect.any(Date), wakeRequested: false },
        ]);
        expect(claimNudgeService.notify).toHaveBeenCalled();
      });

      test('flags a running parent so its next yield resumes at once', async () => {
        const { store, service } = setup();
        store.bulkGetWithoutApiKeys.mockResolvedValue([task({ status: TaskStatus.Running })]);

        await expect(service.notifyParent(child('a'))).resolves.toBe('deferred');

        expect(store.bulkPartialUpdate).toHaveBeenCalledWith([
          { id: 'parent', wakeRequested: true },
        ]);
      });

      test('does not write again when a running parent is already flagged', async () => {
        const { store, service } = setup();
        store.bulkGetWithoutApiKeys.mockResolvedValue([
          task({ status: TaskStatus.Running, wakeRequested: true }),
        ]);

        await expect(service.notifyParent(child('a'))).resolves.toBe('deferred');

        expect(store.bulkPartialUpdate).not.toHaveBeenCalled();
      });

      test('reports an orphan when the parent is gone', async () => {
        const { store, service } = setup();
        store.bulkGetWithoutApiKeys.mockResolvedValue([]);

        await expect(service.notifyParent(child('a'))).resolves.toBe('orphan');
        expect(store.bulkPartialUpdate).not.toHaveBeenCalled();
      });

      test('leaves an idle parent alone', async () => {
        const { store, service } = setup();
        store.bulkGetWithoutApiKeys.mockResolvedValue([task({ status: TaskStatus.Idle })]);

        await expect(service.notifyParent(child('a'))).resolves.toBe('noop');
        expect(store.bulkPartialUpdate).not.toHaveBeenCalled();
      });

      test('is a noop for a task without a parent', async () => {
        const { store, service } = setup();

        await expect(service.notifyParent(task())).resolves.toBe('noop');
        expect(store.bulkGetWithoutApiKeys).not.toHaveBeenCalled();
      });
    });

    describe('spawn', () => {
      test('creates children with deterministic ids linked to the parent', async () => {
        const { scheduling, context, onSpawned } = setup();

        const views = await context(task({ priority: 40 })).spawn([
          { key: 'shard-0', taskType: 'childType', params: { shard: 0 } },
          { key: 'shard-1', taskType: 'childType', params: { shard: 1 }, priority: 50 },
        ]);

        expect(scheduling.bulkSchedule).toHaveBeenCalledWith(
          [
            expect.objectContaining({
              id: 'parent:shard-0',
              taskType: 'childType',
              params: { shard: 0 },
              state: {},
              scope: ['testing'],
              priority: 40,
              parentId: 'parent',
              rootId: 'parent',
              depth: 1,
              childKey: 'shard-0',
            }),
            expect.objectContaining({ id: 'parent:shard-1', priority: 50 }),
          ],
          undefined
        );
        expect(views.map(({ id, outcome }) => [id, outcome])).toEqual([
          ['parent:shard-0', 'inProgress'],
          ['parent:shard-1', 'inProgress'],
        ]);
        expect(onSpawned).toHaveBeenCalledTimes(1);
      });

      test('keeps the root of a nested tree and increments the depth', async () => {
        const { scheduling, context } = setup();

        await context(task({ id: 'root:mid', rootId: 'root', depth: 1, parentId: 'root' })).spawn([
          { key: 'leaf', taskType: 'childType' },
        ]);

        expect(scheduling.bulkSchedule).toHaveBeenCalledWith(
          [expect.objectContaining({ id: 'root:mid:leaf', rootId: 'root', depth: 2 })],
          undefined
        );
      });

      test('does not recreate children that already exist', async () => {
        const { store, scheduling, context } = setup();
        store.bulkGetWithoutApiKeys.mockResolvedValue([child('a', { status: TaskStatus.Running })]);

        const views = await context().spawn([
          { key: 'a', taskType: 'childType' },
          { key: 'b', taskType: 'childType' },
        ]);

        expect(scheduling.bulkSchedule).toHaveBeenCalledWith(
          [expect.objectContaining({ id: 'parent:b' })],
          undefined
        );
        expect(views.map(({ key }) => key).sort()).toEqual(['a', 'b']);
      });

      test('schedules nothing when every child already exists', async () => {
        const { store, scheduling, context, onSpawned } = setup();
        store.bulkGetWithoutApiKeys.mockResolvedValue([child('a')]);

        await context().spawn([{ key: 'a', taskType: 'childType' }]);

        expect(scheduling.bulkSchedule).not.toHaveBeenCalled();
        expect(onSpawned).toHaveBeenCalled();
      });

      test('passes the parent fake request on so children reuse its API key', async () => {
        const { scheduling, context } = setup();
        const fakeRequest = kibanaRequestFactory({
          headers: { authorization: 'ApiKey abc' },
          path: '/',
        });

        await context(task(), fakeRequest).spawn([{ key: 'a', taskType: 'childType' }]);

        expect(scheduling.bulkSchedule).toHaveBeenCalledWith(expect.any(Array), {
          request: fakeRequest,
        });
      });

      test('passes the parent service account credential on as runAs', async () => {
        const { scheduling, context } = setup();

        await context(
          task({
            credential: {
              type: 'service_account',
              workloadType: 'wt',
              workloadId: 'wid',
              spaceId: 'default',
            },
          })
        ).spawn([{ key: 'a', taskType: 'childType' }]);

        expect(scheduling.bulkSchedule).toHaveBeenCalledWith(
          [
            expect.objectContaining({
              runAs: {
                workloadType: 'wt',
                workloadId: 'wid',
                spaceId: 'default',
                expectedServiceAccountId: null,
              },
            }),
          ],
          undefined
        );
      });

      test('rejects a recurring parent', async () => {
        const { context } = setup();
        await expect(
          context(task({ schedule: { interval: '1m' } })).spawn([
            { key: 'a', taskType: 'childType' },
          ])
        ).rejects.toThrow('only ad-hoc tasks can spawn sub-tasks');
      });

      test('rejects invalid and duplicate keys', async () => {
        const { context } = setup();
        await expect(
          context().spawn([{ key: 'has space', taskType: 'childType' }])
        ).rejects.toThrow('Invalid sub-task key');
        await expect(
          context().spawn([
            { key: 'a', taskType: 'childType' },
            { key: 'a', taskType: 'childType' },
          ])
        ).rejects.toThrow('Duplicate sub-task key');
      });

      test('rejects a tree nested deeper than the limit', async () => {
        const { context } = setup();
        await expect(
          context(task({ depth: MAX_FAN_OUT_DEPTH })).spawn([{ key: 'a', taskType: 'childType' }])
        ).rejects.toThrow(`may not be nested deeper than ${MAX_FAN_OUT_DEPTH}`);
      });

      test('rejects more children than the limit, counting existing siblings', async () => {
        const { store, context } = setup();
        store.search.mockResolvedValue({
          docs: Array.from({ length: MAX_CHILDREN_PER_PARENT }, (_, i) => child(`old-${i}`)),
          versionMap: new Map(),
        });
        await expect(
          context().spawn([{ key: 'one-more', taskType: 'childType' }])
        ).rejects.toThrow(`the limit is ${MAX_CHILDREN_PER_PARENT}`);
      });

      test('fails when scheduling is not available yet', async () => {
        const store = taskStoreMock.create();
        store.search.mockResolvedValue({ docs: [], versionMap: new Map() });
        const service = new TaskFanOutService({
          logger: mockLogger(),
          store,
          getScheduling: () => undefined,
        });
        await expect(
          service
            .createContext(task(), { onSpawned: jest.fn() })
            .spawn([{ key: 'a', taskType: 'childType' }])
        ).rejects.toThrow('scheduling is not available yet');
      });
    });

    describe('summarize', () => {
      test('reads the expected children by id (realtime) and summarizes them', async () => {
        const { store, context } = setup();
        store.bulkGetWithoutApiKeys.mockResolvedValue([
          child('a', { status: TaskStatus.Done, state: { r: 'A' } }),
        ]);

        const summary = await context().summarize(['a', 'b']);

        expect(store.bulkGetWithoutApiKeys).toHaveBeenCalledWith(['parent:a', 'parent:b']);
        expect(summary).toMatchObject({ expected: 2, done: 1, missing: 1, settled: true });
        expect(summary.children[0].state).toEqual({ r: 'A' });
      });
    });

    describe('cancel', () => {
      test('removes children that are not running and asks running ones to stop', async () => {
        const { store, context } = setup();
        store.search.mockResolvedValue({
          docs: [
            child('idle', { status: TaskStatus.Idle }),
            child('waiting', { status: TaskStatus.Waiting }),
            child('running', { status: TaskStatus.Running }),
            child('done', { status: TaskStatus.Done }),
            child('failed', { status: TaskStatus.Failed }),
          ],
          versionMap: new Map(),
        });

        await context().cancel();

        expect(store.bulkPartialUpdate).toHaveBeenCalledWith([
          { id: 'parent:running', cancelRequested: true },
        ]);
        expect(store.bulkRemove).toHaveBeenCalledWith(['parent:idle', 'parent:waiting']);
      });

      test('cancels only the given keys', async () => {
        const { store, context } = setup();
        store.bulkGetWithoutApiKeys.mockResolvedValue([child('a', { status: TaskStatus.Idle })]);

        await context().cancel(['a']);

        expect(store.bulkGetWithoutApiKeys).toHaveBeenCalledWith(['parent:a']);
        expect(store.bulkRemove).toHaveBeenCalledWith(['parent:a']);
        expect(store.bulkPartialUpdate).not.toHaveBeenCalled();
      });
    });

    describe('respawn', () => {
      test('removes a terminal child and spawns it again', async () => {
        const { store, scheduling, context } = setup();
        store.bulkGetWithoutApiKeys
          .mockResolvedValueOnce([child('a', { status: TaskStatus.Failed })])
          .mockResolvedValueOnce([]);

        await context().respawn({ key: 'a', taskType: 'childType', params: { generation: 2 } });

        expect(store.bulkRemove).toHaveBeenCalledWith(['parent:a']);
        expect(scheduling.bulkSchedule).toHaveBeenCalledWith(
          [expect.objectContaining({ id: 'parent:a', params: { generation: 2 } })],
          undefined
        );
      });

      test('refuses to respawn a child that is still in progress', async () => {
        const { store, context } = setup();
        store.bulkGetWithoutApiKeys.mockResolvedValue([child('a', { status: TaskStatus.Running })]);

        await expect(context().respawn({ key: 'a', taskType: 'childType' })).rejects.toThrow(
          'is still in progress'
        );
        expect(store.bulkRemove).not.toHaveBeenCalled();
      });
    });

    describe('cleanup', () => {
      test('removes terminal children only', async () => {
        const { store, context } = setup();
        store.search.mockResolvedValue({
          docs: [
            child('done', { status: TaskStatus.Done }),
            child('failed', { status: TaskStatus.Failed }),
            child('cancelled', { status: TaskStatus.Cancelled }),
            child('running', { status: TaskStatus.Running }),
          ],
          versionMap: new Map(),
        });

        await context().cleanup();

        expect(store.bulkRemove).toHaveBeenCalledWith([
          'parent:done',
          'parent:failed',
          'parent:cancelled',
        ]);
      });
    });
  });
});
