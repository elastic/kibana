/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import sinon from 'sinon';
import { v4 as uuidv4 } from 'uuid';
import { filter, take } from 'rxjs';

import { CLAIM_STRATEGY_MGET, DEFAULT_KIBANAS_PER_PARTITION } from '../config';
import { NO_ASSIGNED_PARTITIONS_WARNING_INTERVAL } from './strategy_mget';

import {
  TaskStatus,
  ConcreteTaskInstance,
  ConcreteTaskInstanceVersion,
  TaskPriority,
  TaskCost,
  PartialConcreteTaskInstance,
} from '../task';
import { SearchOpts, StoreOpts } from '../task_store';
import { asTaskClaimEvent, TaskEvent } from '../task_events';
import { asOk, asErr, isOk, unwrap } from '../lib/result_type';
import { TaskTypeDictionary } from '../task_type_dictionary';
import { mockLogger } from '../test_utils';
import {
  TaskClaiming,
  OwnershipClaimingOpts,
  TaskClaimingOpts,
  TASK_MANAGER_MARK_AS_CLAIMED,
} from '../queries/task_claiming';
import { taskStoreMock } from '../task_store.mock';
import apm from 'elastic-apm-node';
import { TASK_MANAGER_TRANSACTION_TYPE } from '../task_running';
import { ClaimOwnershipResult } from '.';
import { FillPoolResult } from '../lib/fill_pool';
import { TaskPartitioner } from '../lib/task_partitioner';
import type { MustNotCondition } from '../queries/query_clauses';
import {
  createDiscoveryServiceMock,
  createFindSO,
} from '../kibana_discovery_service/mock_kibana_discovery_service';

jest.mock('../constants', () => ({
  CONCURRENCY_ALLOW_LIST_BY_TASK_TYPE: [
    'limitedToZero',
    'limitedToOne',
    'anotherLimitedToZero',
    'anotherLimitedToOne',
    'limitedToTwo',
    'limitedToFive',
    'yawn',
  ],
}));

let fakeTimer: sinon.SinonFakeTimers;
const taskManagerLogger = mockLogger();

beforeEach(() => jest.clearAllMocks());

const mockedDate = new Date('2019-02-12T21:01:22.479Z');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).Date = class Date {
  constructor() {
    return mockedDate;
  }
  static now() {
    return mockedDate.getTime();
  }
};

const taskDefinitions = new TaskTypeDictionary(taskManagerLogger);
taskDefinitions.registerTaskDefinitions({
  report: {
    title: 'report',
    cost: TaskCost.Normal,
    createTaskRunner: jest.fn(),
  },
  dernstraight: {
    title: 'dernstraight',
    cost: TaskCost.ExtraLarge,
    createTaskRunner: jest.fn(),
  },
  yawn: {
    title: 'yawn',
    cost: TaskCost.Tiny,
    maxConcurrency: 1,
    createTaskRunner: jest.fn(),
  },
});

const mockApmTrans = {
  end: jest.fn(),
};

const discoveryServiceMock = createDiscoveryServiceMock('test');
const lastSeen = '2024-08-10T10:00:00.000Z';
discoveryServiceMock.getActiveKibanaNodes.mockResolvedValue([
  createFindSO('test', lastSeen),
  createFindSO('test-pod-2', lastSeen),
  createFindSO('test-pod-3', lastSeen),
]);
const taskPartitioner = new TaskPartitioner({
  podName: 'test',
  kibanaDiscoveryService: discoveryServiceMock,
  kibanasPerPartition: DEFAULT_KIBANAS_PER_PARTITION,
  logger: taskManagerLogger,
});

// needs more tests in the similar to the `strategy_default.test.ts` test suite
describe('TaskClaiming', () => {
  beforeAll(() => {
    fakeTimer = sinon.useFakeTimers();
  });

  afterAll(() => fakeTimer.restore());

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(apm, 'startTransaction')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation(() => mockApmTrans as any);
    jest.spyOn(taskPartitioner, 'getPartitions').mockResolvedValue([1, 3]);
  });

  describe('claimAvailableTasks', () => {
    function getVersionMapsFromTasks(tasks: ConcreteTaskInstance[]) {
      const versionMap = new Map<string, ConcreteTaskInstanceVersion>();
      const docLatestVersions = new Map<string, ConcreteTaskInstanceVersion>();
      for (const task of tasks) {
        versionMap.set(task.id, { esId: task.id, seqNo: 32, primaryTerm: 32 });
        docLatestVersions.set(`task:${task.id}`, { esId: task.id, seqNo: 32, primaryTerm: 32 });
      }

      return { versionMap, docLatestVersions };
    }

    function initialiseTestClaiming({
      storeOpts = {},
      taskClaimingOpts = {},
      hits,
      versionMaps,
      excludedTaskTypes = [],
      unusedTaskTypes = [],
    }: {
      storeOpts: Partial<StoreOpts>;
      taskClaimingOpts: Partial<TaskClaimingOpts>;
      hits?: ConcreteTaskInstance[][];
      versionMaps?: Array<Map<string, ConcreteTaskInstanceVersion>>;
      excludedTaskTypes?: string[];
      unusedTaskTypes?: string[];
    }) {
      const definitions = storeOpts.definitions ?? taskDefinitions;
      const store = taskStoreMock.create({ taskManagerId: storeOpts.taskManagerId });
      store.convertToSavedObjectIds.mockImplementation((ids) => ids.map((id) => `task:${id}`));

      if (hits == null) hits = [generateFakeTasks(1)];

      const docVersion = [];
      if (versionMaps == null) {
        versionMaps = [];
        for (const oneHit of hits) {
          const map = new Map<string, ConcreteTaskInstanceVersion>();
          const mapWithTaskPrefix = new Map<string, ConcreteTaskInstanceVersion>();
          for (const task of oneHit) {
            map.set(task.id, { esId: task.id, seqNo: 32, primaryTerm: 32 });
            mapWithTaskPrefix.set(`task:${task.id}`, { esId: task.id, seqNo: 32, primaryTerm: 32 });
          }
          versionMaps.push(map);
          docVersion.push(mapWithTaskPrefix);
        }
      }

      for (let i = 0; i < hits.length; i++) {
        store.msearch.mockResolvedValueOnce({ docs: hits[i], versionMap: versionMaps[i] });
        store.getDocVersions.mockResolvedValueOnce(versionMaps[i]);
        const oneBulkResult = hits[i].map((hit) => getPartialUpdateResult(hit));
        store.bulkPartialUpdate.mockResolvedValueOnce(oneBulkResult);
        const oneBulkGetResult = hits[i].map((hit) => asOk(hit));
        store.bulkGet.mockResolvedValueOnce(oneBulkGetResult);
      }

      const taskClaiming = new TaskClaiming({
        logger: taskManagerLogger,
        strategy: CLAIM_STRATEGY_MGET,
        definitions,
        taskStore: store,
        excludedTaskTypes,
        maxAttempts: taskClaimingOpts.maxAttempts ?? 2,
        getAvailableCapacity: taskClaimingOpts.getAvailableCapacity ?? (() => 10),
        taskPartitioner,
        ...taskClaimingOpts,
      });

      return { taskClaiming, store };
    }

    async function testClaimAvailableTasks({
      storeOpts = {},
      taskClaimingOpts = {},
      claimingOpts,
      hits = [generateFakeTasks(1)],
      excludedTaskTypes = [],
    }: {
      storeOpts: Partial<StoreOpts>;
      taskClaimingOpts: Partial<TaskClaimingOpts>;
      claimingOpts: Omit<OwnershipClaimingOpts, 'size' | 'taskTypes'>;
      hits?: ConcreteTaskInstance[][];
      excludedTaskTypes?: string[];
    }) {
      const { taskClaiming, store } = initialiseTestClaiming({
        storeOpts,
        taskClaimingOpts,
        excludedTaskTypes,
        hits,
      });

      const resultOrErr = await taskClaiming.claimAvailableTasksIfCapacityIsAvailable(claimingOpts);
      if (!isOk<ClaimOwnershipResult, FillPoolResult>(resultOrErr)) {
        expect(resultOrErr).toBe(undefined);
      }

      if (!isOk<ClaimOwnershipResult, FillPoolResult>(resultOrErr)) {
        expect(resultOrErr).toBe(undefined);
      }
      const result = unwrap(resultOrErr) as ClaimOwnershipResult;

      expect(apm.startTransaction).toHaveBeenCalledWith(
        TASK_MANAGER_MARK_AS_CLAIMED,
        TASK_MANAGER_TRANSACTION_TYPE
      );
      expect(mockApmTrans.end).toHaveBeenCalledWith('success');

      expect(store.msearch.mock.calls).toMatchObject({});
      expect(store.getDocVersions.mock.calls).toMatchObject({});
      return {
        result,
        args: {
          search: store.msearch.mock.calls[0][0] as SearchOpts[] & {
            query: MustNotCondition;
          },
        },
      };
    }

    test('makes calls to APM as expected when markAvailableTasksAsClaimed throws error', async () => {
      const maxAttempts = _.random(2, 43);
      const customMaxAttempts = _.random(44, 100);

      const definitions = new TaskTypeDictionary(mockLogger());
      definitions.registerTaskDefinitions({
        foo: {
          title: 'foo',
          createTaskRunner: jest.fn(),
        },
        bar: {
          title: 'bar',
          maxAttempts: customMaxAttempts,
          createTaskRunner: jest.fn(),
        },
      });

      const { taskClaiming, store } = initialiseTestClaiming({
        storeOpts: {
          definitions,
        },
        taskClaimingOpts: {
          maxAttempts,
        },
      });

      store.msearch.mockReset();
      store.msearch.mockRejectedValue(new Error('Oh no'));

      await expect(
        taskClaiming.claimAvailableTasksIfCapacityIsAvailable({
          claimOwnershipUntil: new Date(),
        })
      ).rejects.toMatchInlineSnapshot(`[Error: Oh no]`);

      expect(apm.startTransaction).toHaveBeenCalledWith(
        TASK_MANAGER_MARK_AS_CLAIMED,
        TASK_MANAGER_TRANSACTION_TYPE
      );
      expect(mockApmTrans.end).toHaveBeenCalledWith('failure');
    });

    test('it filters claimed tasks down by supported types, maxAttempts, status, and runAt', async () => {
      const maxAttempts = _.random(2, 43);
      const customMaxAttempts = _.random(44, 100);

      const definitions = new TaskTypeDictionary(mockLogger());
      definitions.registerTaskDefinitions({
        foo: {
          title: 'foo',
          priority: TaskPriority.Low,
          createTaskRunner: jest.fn(),
        },
        bar: {
          title: 'bar',
          maxAttempts: customMaxAttempts,
          createTaskRunner: jest.fn(),
        },
        foobar: {
          title: 'foobar',
          maxAttempts: customMaxAttempts,
          createTaskRunner: jest.fn(),
        },
      });

      const result = await testClaimAvailableTasks({
        storeOpts: { definitions },
        taskClaimingOpts: { maxAttempts },
        claimingOpts: { claimOwnershipUntil: new Date() },
        excludedTaskTypes: ['foobar'],
      });
      expect(result).toMatchObject({});
    });

    test('should limit claimed tasks based on task cost and available capacity', async () => {
      const store = taskStoreMock.create({ taskManagerId: 'test-test' });
      store.convertToSavedObjectIds.mockImplementation((ids) => ids.map((id) => `task:${id}`));

      const fetchedTasks = [
        mockInstance({ id: `id-1`, taskType: 'report' }), // total cost = 2
        mockInstance({ id: `id-2`, taskType: 'report' }), // total cost = 4
        mockInstance({ id: `id-3`, taskType: 'yawn' }), // total cost = 5
        mockInstance({ id: `id-4`, taskType: 'dernstraight' }), // claiming this will exceed the available capacity
        mockInstance({ id: `id-5`, taskType: 'report' }),
        mockInstance({ id: `id-6`, taskType: 'report' }),
      ];

      const { versionMap, docLatestVersions } = getVersionMapsFromTasks(fetchedTasks);
      store.msearch.mockResolvedValueOnce({ docs: fetchedTasks, versionMap });
      store.getDocVersions.mockResolvedValueOnce(docLatestVersions);

      store.bulkGet.mockResolvedValueOnce(
        [fetchedTasks[0], fetchedTasks[1], fetchedTasks[2]].map(asOk)
      );
      store.bulkPartialUpdate.mockResolvedValueOnce(
        [fetchedTasks[0], fetchedTasks[1], fetchedTasks[2]].map(getPartialUpdateResult)
      );

      const taskClaiming = new TaskClaiming({
        logger: taskManagerLogger,
        strategy: CLAIM_STRATEGY_MGET,
        definitions: taskDefinitions,
        taskStore: store,
        excludedTaskTypes: [],
        maxAttempts: 2,
        getAvailableCapacity: () => 10,
        taskPartitioner,
      });

      const resultOrErr = await taskClaiming.claimAvailableTasksIfCapacityIsAvailable({
        claimOwnershipUntil: new Date(),
      });

      if (!isOk<ClaimOwnershipResult, FillPoolResult>(resultOrErr)) {
        expect(resultOrErr).toBe(undefined);
      }

      const result = unwrap(resultOrErr) as ClaimOwnershipResult;

      expect(apm.startTransaction).toHaveBeenCalledWith(
        TASK_MANAGER_MARK_AS_CLAIMED,
        TASK_MANAGER_TRANSACTION_TYPE
      );
      expect(mockApmTrans.end).toHaveBeenCalledWith('success');

      expect(taskManagerLogger.debug).toHaveBeenCalledWith(
        'task claimer claimed: 3; stale: 0; conflicts: 0; missing: 0; capacity reached: 3; updateErrors: 0; getErrors: 0;',
        { tags: ['taskClaiming', 'claimAvailableTasksMget'] }
      );

      expect(store.msearch.mock.calls[0][0]?.[0]).toMatchObject({
        size: 40,
        seq_no_primary_term: true,
      });
      expect(store.getDocVersions).toHaveBeenCalledWith([
        'task:id-1',
        'task:id-2',
        'task:id-3',
        'task:id-4',
        'task:id-5',
        'task:id-6',
      ]);
      expect(store.bulkPartialUpdate).toHaveBeenCalledTimes(1);
      expect(store.bulkPartialUpdate).toHaveBeenCalledWith([
        {
          id: fetchedTasks[0].id,
          version: fetchedTasks[0].version,
          scheduledAt: fetchedTasks[0].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[1].id,
          version: fetchedTasks[1].version,
          scheduledAt: fetchedTasks[1].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[2].id,
          version: fetchedTasks[2].version,
          scheduledAt: fetchedTasks[2].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
      ]);
      expect(store.bulkGet).toHaveBeenCalledWith(['id-1', 'id-2', 'id-3']);

      expect(result.stats).toEqual({
        tasksClaimed: 3,
        tasksConflicted: 0,
        tasksErrors: 0,
        tasksUpdated: 3,
        staleTasks: 0,
        tasksLeftUnclaimed: 3,
      });
      expect(result.docs.length).toEqual(3);
    });

    test('should handle no tasks to claim', async () => {
      const store = taskStoreMock.create({ taskManagerId: 'test-test' });
      store.convertToSavedObjectIds.mockImplementation((ids) => ids.map((id) => `task:${id}`));

      const fetchedTasks: ConcreteTaskInstance[] = [];

      const { versionMap } = getVersionMapsFromTasks(fetchedTasks);
      store.msearch.mockResolvedValueOnce({ docs: fetchedTasks, versionMap });

      const taskClaiming = new TaskClaiming({
        logger: taskManagerLogger,
        strategy: CLAIM_STRATEGY_MGET,
        definitions: taskDefinitions,
        taskStore: store,
        excludedTaskTypes: [],
        maxAttempts: 2,
        getAvailableCapacity: () => 10,
        taskPartitioner,
      });

      const resultOrErr = await taskClaiming.claimAvailableTasksIfCapacityIsAvailable({
        claimOwnershipUntil: new Date(),
      });

      if (!isOk<ClaimOwnershipResult, FillPoolResult>(resultOrErr)) {
        expect(resultOrErr).toBe(undefined);
      }

      const result = unwrap(resultOrErr) as ClaimOwnershipResult;

      expect(apm.startTransaction).toHaveBeenCalledWith(
        TASK_MANAGER_MARK_AS_CLAIMED,
        TASK_MANAGER_TRANSACTION_TYPE
      );
      expect(mockApmTrans.end).toHaveBeenCalledWith('success');

      expect(taskManagerLogger.debug).not.toHaveBeenCalled();

      expect(store.msearch.mock.calls[0][0]?.[0]).toMatchObject({
        size: 40,
        seq_no_primary_term: true,
      });
      expect(store.getDocVersions).not.toHaveBeenCalled();
      expect(store.bulkGet).not.toHaveBeenCalled();
      expect(store.bulkPartialUpdate).not.toHaveBeenCalled();

      expect(result.stats).toEqual({
        tasksClaimed: 0,
        tasksConflicted: 0,
        tasksUpdated: 0,
        staleTasks: 0,
      });
      expect(result.docs.length).toEqual(0);
    });

    test('should handle tasks with no search version', async () => {
      const store = taskStoreMock.create({ taskManagerId: 'test-test' });
      store.convertToSavedObjectIds.mockImplementation((ids) => ids.map((id) => `task:${id}`));

      const fetchedTasks = [
        mockInstance({ id: `id-1`, taskType: 'report' }),
        mockInstance({ id: `id-2`, taskType: 'report' }),
        mockInstance({ id: `id-3`, taskType: 'yawn' }),
      ];

      const { versionMap, docLatestVersions } = getVersionMapsFromTasks(fetchedTasks);
      versionMap.delete('id-1');
      store.msearch.mockResolvedValueOnce({ docs: fetchedTasks, versionMap });
      store.getDocVersions.mockResolvedValueOnce(docLatestVersions);

      store.bulkGet.mockResolvedValueOnce([fetchedTasks[1], fetchedTasks[2]].map(asOk));
      store.bulkPartialUpdate.mockResolvedValueOnce(
        [fetchedTasks[1], fetchedTasks[2]].map(getPartialUpdateResult)
      );

      const taskClaiming = new TaskClaiming({
        logger: taskManagerLogger,
        strategy: CLAIM_STRATEGY_MGET,
        definitions: taskDefinitions,
        taskStore: store,
        excludedTaskTypes: [],
        maxAttempts: 2,
        getAvailableCapacity: () => 10,
        taskPartitioner,
      });

      const resultOrErr = await taskClaiming.claimAvailableTasksIfCapacityIsAvailable({
        claimOwnershipUntil: new Date(),
      });

      if (!isOk<ClaimOwnershipResult, FillPoolResult>(resultOrErr)) {
        expect(resultOrErr).toBe(undefined);
      }

      const result = unwrap(resultOrErr) as ClaimOwnershipResult;

      expect(apm.startTransaction).toHaveBeenCalledWith(
        TASK_MANAGER_MARK_AS_CLAIMED,
        TASK_MANAGER_TRANSACTION_TYPE
      );
      expect(mockApmTrans.end).toHaveBeenCalledWith('success');

      expect(taskManagerLogger.debug).toHaveBeenCalledWith(
        'task claimer claimed: 2; stale: 0; conflicts: 0; missing: 1; capacity reached: 0; updateErrors: 0; getErrors: 0;',
        { tags: ['taskClaiming', 'claimAvailableTasksMget'] }
      );

      expect(store.msearch.mock.calls[0][0]?.[0]).toMatchObject({
        size: 40,
        seq_no_primary_term: true,
      });
      expect(store.getDocVersions).toHaveBeenCalledWith(['task:id-1', 'task:id-2', 'task:id-3']);
      expect(store.bulkPartialUpdate).toHaveBeenCalledTimes(1);
      expect(store.bulkPartialUpdate).toHaveBeenCalledWith([
        {
          id: fetchedTasks[1].id,
          version: fetchedTasks[1].version,
          scheduledAt: fetchedTasks[1].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[2].id,
          version: fetchedTasks[2].version,
          scheduledAt: fetchedTasks[2].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
      ]);
      expect(store.bulkGet).toHaveBeenCalledWith(['id-2', 'id-3']);

      expect(result.stats).toEqual({
        tasksClaimed: 2,
        tasksConflicted: 0,
        tasksErrors: 0,
        tasksUpdated: 2,
        tasksLeftUnclaimed: 0,
        staleTasks: 0,
      });
      expect(result.docs.length).toEqual(2);
    });

    test('should handle tasks with no latest version', async () => {
      const store = taskStoreMock.create({ taskManagerId: 'test-test' });
      store.convertToSavedObjectIds.mockImplementation((ids) => ids.map((id) => `task:${id}`));

      const fetchedTasks = [
        mockInstance({ id: `id-1`, taskType: 'report' }),
        mockInstance({ id: `id-2`, taskType: 'report' }),
        mockInstance({ id: `id-3`, taskType: 'yawn' }),
      ];

      const { versionMap, docLatestVersions } = getVersionMapsFromTasks(fetchedTasks);
      docLatestVersions.delete('task:id-1');
      store.msearch.mockResolvedValueOnce({ docs: fetchedTasks, versionMap });
      store.getDocVersions.mockResolvedValueOnce(docLatestVersions);

      store.bulkGet.mockResolvedValueOnce([fetchedTasks[1], fetchedTasks[2]].map(asOk));
      store.bulkPartialUpdate.mockResolvedValueOnce(
        [fetchedTasks[1], fetchedTasks[2]].map(getPartialUpdateResult)
      );

      const taskClaiming = new TaskClaiming({
        logger: taskManagerLogger,
        strategy: CLAIM_STRATEGY_MGET,
        definitions: taskDefinitions,
        taskStore: store,
        excludedTaskTypes: [],
        maxAttempts: 2,
        getAvailableCapacity: () => 10,
        taskPartitioner,
      });

      const resultOrErr = await taskClaiming.claimAvailableTasksIfCapacityIsAvailable({
        claimOwnershipUntil: new Date(),
      });

      if (!isOk<ClaimOwnershipResult, FillPoolResult>(resultOrErr)) {
        expect(resultOrErr).toBe(undefined);
      }

      const result = unwrap(resultOrErr) as ClaimOwnershipResult;

      expect(apm.startTransaction).toHaveBeenCalledWith(
        TASK_MANAGER_MARK_AS_CLAIMED,
        TASK_MANAGER_TRANSACTION_TYPE
      );
      expect(mockApmTrans.end).toHaveBeenCalledWith('success');

      expect(taskManagerLogger.debug).toHaveBeenCalledWith(
        'task claimer claimed: 2; stale: 0; conflicts: 0; missing: 1; capacity reached: 0; updateErrors: 0; getErrors: 0;',
        { tags: ['taskClaiming', 'claimAvailableTasksMget'] }
      );

      expect(store.msearch.mock.calls[0][0]?.[0]).toMatchObject({
        size: 40,
        seq_no_primary_term: true,
      });
      expect(store.getDocVersions).toHaveBeenCalledWith(['task:id-1', 'task:id-2', 'task:id-3']);
      expect(store.bulkPartialUpdate).toHaveBeenCalledTimes(1);
      expect(store.bulkPartialUpdate).toHaveBeenCalledWith([
        {
          id: fetchedTasks[1].id,
          version: fetchedTasks[1].version,
          scheduledAt: fetchedTasks[1].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[2].id,
          version: fetchedTasks[2].version,
          scheduledAt: fetchedTasks[2].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
      ]);
      expect(store.bulkGet).toHaveBeenCalledWith(['id-2', 'id-3']);

      expect(result.stats).toEqual({
        tasksClaimed: 2,
        tasksConflicted: 0,
        tasksErrors: 0,
        tasksUpdated: 2,
        tasksLeftUnclaimed: 0,
        staleTasks: 0,
      });
      expect(result.docs.length).toEqual(2);
    });

    test('should handle stale tasks', async () => {
      const store = taskStoreMock.create({ taskManagerId: 'test-test' });
      store.convertToSavedObjectIds.mockImplementation((ids) => ids.map((id) => `task:${id}`));

      const fetchedTasks = [
        mockInstance({ id: `id-1`, taskType: 'report' }),
        mockInstance({ id: `id-2`, taskType: 'report' }),
        mockInstance({ id: `id-3`, taskType: 'yawn' }),
      ];

      const { versionMap, docLatestVersions } = getVersionMapsFromTasks(fetchedTasks);
      docLatestVersions.set('task:id-1', { esId: 'task:id-1', seqNo: 33, primaryTerm: 33 });
      store.msearch.mockResolvedValueOnce({ docs: fetchedTasks, versionMap });
      store.getDocVersions.mockResolvedValueOnce(docLatestVersions);

      store.bulkGet.mockResolvedValueOnce([fetchedTasks[1], fetchedTasks[2]].map(asOk));
      store.bulkPartialUpdate.mockResolvedValueOnce(
        [fetchedTasks[1], fetchedTasks[2]].map(getPartialUpdateResult)
      );

      const taskClaiming = new TaskClaiming({
        logger: taskManagerLogger,
        strategy: CLAIM_STRATEGY_MGET,
        definitions: taskDefinitions,
        taskStore: store,
        excludedTaskTypes: [],
        maxAttempts: 2,
        getAvailableCapacity: () => 10,
        taskPartitioner,
      });

      const resultOrErr = await taskClaiming.claimAvailableTasksIfCapacityIsAvailable({
        claimOwnershipUntil: new Date(),
      });

      if (!isOk<ClaimOwnershipResult, FillPoolResult>(resultOrErr)) {
        expect(resultOrErr).toBe(undefined);
      }

      const result = unwrap(resultOrErr) as ClaimOwnershipResult;

      expect(apm.startTransaction).toHaveBeenCalledWith(
        TASK_MANAGER_MARK_AS_CLAIMED,
        TASK_MANAGER_TRANSACTION_TYPE
      );
      expect(mockApmTrans.end).toHaveBeenCalledWith('success');

      expect(taskManagerLogger.debug).toHaveBeenCalledWith(
        'task claimer claimed: 2; stale: 1; conflicts: 0; missing: 0; capacity reached: 0; updateErrors: 0; getErrors: 0;',
        { tags: ['taskClaiming', 'claimAvailableTasksMget'] }
      );

      expect(store.msearch.mock.calls[0][0]?.[0]).toMatchObject({
        size: 40,
        seq_no_primary_term: true,
      });
      expect(store.getDocVersions).toHaveBeenCalledWith(['task:id-1', 'task:id-2', 'task:id-3']);
      expect(store.bulkPartialUpdate).toHaveBeenCalledTimes(1);
      expect(store.bulkPartialUpdate).toHaveBeenCalledWith([
        {
          id: fetchedTasks[1].id,
          version: fetchedTasks[1].version,
          scheduledAt: fetchedTasks[1].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[2].id,
          version: fetchedTasks[2].version,
          scheduledAt: fetchedTasks[2].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
      ]);
      expect(store.bulkGet).toHaveBeenCalledWith(['id-2', 'id-3']);

      expect(result.stats).toEqual({
        tasksClaimed: 2,
        tasksConflicted: 0,
        tasksErrors: 0,
        tasksUpdated: 2,
        tasksLeftUnclaimed: 0,
        staleTasks: 1,
      });
      expect(result.docs.length).toEqual(2);
    });

    test('should correctly handle limited concurrency tasks', async () => {
      const store = taskStoreMock.create({ taskManagerId: 'test-test' });
      store.convertToSavedObjectIds.mockImplementation((ids) => ids.map((id) => `task:${id}`));

      const fetchedTasks = [
        mockInstance({ id: `id-1`, taskType: 'report' }),
        mockInstance({ id: `id-2`, taskType: 'report' }),
        mockInstance({ id: `id-3`, taskType: 'yawn' }),
        mockInstance({ id: `id-4`, taskType: 'yawn' }),
        mockInstance({ id: `id-5`, taskType: 'report' }),
        mockInstance({ id: `id-6`, taskType: 'yawn' }),
      ];

      const { versionMap, docLatestVersions } = getVersionMapsFromTasks(fetchedTasks);
      store.msearch.mockResolvedValueOnce({ docs: fetchedTasks, versionMap });
      store.getDocVersions.mockResolvedValueOnce(docLatestVersions);

      store.bulkGet.mockResolvedValueOnce(
        [fetchedTasks[0], fetchedTasks[1], fetchedTasks[2], fetchedTasks[4]].map(asOk)
      );
      store.bulkPartialUpdate.mockResolvedValueOnce(
        [fetchedTasks[0], fetchedTasks[1], fetchedTasks[2], fetchedTasks[4]].map(
          getPartialUpdateResult
        )
      );

      const taskClaiming = new TaskClaiming({
        logger: taskManagerLogger,
        strategy: CLAIM_STRATEGY_MGET,
        definitions: taskDefinitions,
        taskStore: store,
        excludedTaskTypes: [],
        maxAttempts: 2,
        getAvailableCapacity: () => 10,
        taskPartitioner,
      });

      const resultOrErr = await taskClaiming.claimAvailableTasksIfCapacityIsAvailable({
        claimOwnershipUntil: new Date(),
      });

      if (!isOk<ClaimOwnershipResult, FillPoolResult>(resultOrErr)) {
        expect(resultOrErr).toBe(undefined);
      }

      const result = unwrap(resultOrErr) as ClaimOwnershipResult;

      expect(apm.startTransaction).toHaveBeenCalledWith(
        TASK_MANAGER_MARK_AS_CLAIMED,
        TASK_MANAGER_TRANSACTION_TYPE
      );
      expect(mockApmTrans.end).toHaveBeenCalledWith('success');

      expect(taskManagerLogger.debug).toHaveBeenCalledWith(
        'task claimer claimed: 4; stale: 0; conflicts: 0; missing: 0; capacity reached: 0; updateErrors: 0; getErrors: 0;',
        { tags: ['taskClaiming', 'claimAvailableTasksMget'] }
      );

      expect(store.msearch.mock.calls[0][0]?.[0]).toMatchObject({
        size: 40,
        seq_no_primary_term: true,
      });
      expect(store.getDocVersions).toHaveBeenCalledWith([
        'task:id-1',
        'task:id-2',
        'task:id-3',
        'task:id-4',
        'task:id-5',
        'task:id-6',
      ]);
      expect(store.bulkPartialUpdate).toHaveBeenCalledTimes(1);
      expect(store.bulkPartialUpdate).toHaveBeenCalledWith([
        {
          id: fetchedTasks[0].id,
          version: fetchedTasks[0].version,
          scheduledAt: fetchedTasks[0].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[1].id,
          version: fetchedTasks[1].version,
          scheduledAt: fetchedTasks[1].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[2].id,
          version: fetchedTasks[2].version,
          scheduledAt: fetchedTasks[2].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[4].id,
          version: fetchedTasks[4].version,
          scheduledAt: fetchedTasks[4].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
      ]);
      expect(store.bulkGet).toHaveBeenCalledWith(['id-1', 'id-2', 'id-3', 'id-5']);

      expect(result.stats).toEqual({
        tasksClaimed: 4,
        tasksConflicted: 0,
        tasksErrors: 0,
        tasksUpdated: 4,
        tasksLeftUnclaimed: 0,
        staleTasks: 0,
      });
      expect(result.docs.length).toEqual(4);
    });

    test('should handle individual errors when bulk getting the full task doc', async () => {
      const store = taskStoreMock.create({ taskManagerId: 'test-test' });
      store.convertToSavedObjectIds.mockImplementation((ids) => ids.map((id) => `task:${id}`));

      const fetchedTasks = [
        mockInstance({ id: `id-1`, taskType: 'report' }),
        mockInstance({ id: `id-2`, taskType: 'report' }),
        mockInstance({ id: `id-3`, taskType: 'yawn' }),
        mockInstance({ id: `id-4`, taskType: 'report' }),
      ];

      const { versionMap, docLatestVersions } = getVersionMapsFromTasks(fetchedTasks);
      store.msearch.mockResolvedValueOnce({ docs: fetchedTasks, versionMap });
      store.getDocVersions.mockResolvedValueOnce(docLatestVersions);
      store.bulkPartialUpdate.mockResolvedValueOnce(
        [fetchedTasks[0], fetchedTasks[1], fetchedTasks[2], fetchedTasks[3]].map(
          getPartialUpdateResult
        )
      );
      store.bulkGet.mockResolvedValueOnce([
        asOk(fetchedTasks[0]),
        // @ts-expect-error
        asErr({
          type: 'task',
          id: fetchedTasks[1].id,
          error: new Error('Oh no'),
        }),
        asOk(fetchedTasks[2]),
        asOk(fetchedTasks[3]),
      ]);

      const taskClaiming = new TaskClaiming({
        logger: taskManagerLogger,
        strategy: CLAIM_STRATEGY_MGET,
        definitions: taskDefinitions,
        taskStore: store,
        excludedTaskTypes: [],
        maxAttempts: 2,
        getAvailableCapacity: () => 10,
        taskPartitioner,
      });

      const resultOrErr = await taskClaiming.claimAvailableTasksIfCapacityIsAvailable({
        claimOwnershipUntil: new Date(),
      });

      if (!isOk<ClaimOwnershipResult, FillPoolResult>(resultOrErr)) {
        expect(resultOrErr).toBe(undefined);
      }

      const result = unwrap(resultOrErr) as ClaimOwnershipResult;

      expect(apm.startTransaction).toHaveBeenCalledWith(
        TASK_MANAGER_MARK_AS_CLAIMED,
        TASK_MANAGER_TRANSACTION_TYPE
      );
      expect(mockApmTrans.end).toHaveBeenCalledWith('success');

      expect(taskManagerLogger.debug).toHaveBeenCalledWith(
        'task claimer claimed: 3; stale: 0; conflicts: 0; missing: 0; capacity reached: 0; updateErrors: 0; getErrors: 1;',
        { tags: ['taskClaiming', 'claimAvailableTasksMget'] }
      );
      expect(taskManagerLogger.error).toHaveBeenCalledWith(
        'Error getting full task id-2:task during claim: Oh no',
        { tags: ['taskClaiming', 'claimAvailableTasksMget'] }
      );

      expect(store.msearch.mock.calls[0][0]?.[0]).toMatchObject({
        size: 40,
        seq_no_primary_term: true,
      });
      expect(store.getDocVersions).toHaveBeenCalledWith([
        'task:id-1',
        'task:id-2',
        'task:id-3',
        'task:id-4',
      ]);
      expect(store.bulkPartialUpdate).toHaveBeenCalledTimes(1);
      expect(store.bulkPartialUpdate).toHaveBeenCalledWith([
        {
          id: fetchedTasks[0].id,
          version: fetchedTasks[0].version,
          scheduledAt: fetchedTasks[0].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[1].id,
          version: fetchedTasks[1].version,
          scheduledAt: fetchedTasks[1].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[2].id,
          version: fetchedTasks[2].version,
          scheduledAt: fetchedTasks[2].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[3].id,
          version: fetchedTasks[3].version,
          scheduledAt: fetchedTasks[3].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
      ]);
      expect(store.bulkGet).toHaveBeenCalledWith(['id-1', 'id-2', 'id-3', 'id-4']);

      expect(result.stats).toEqual({
        tasksClaimed: 3,
        tasksConflicted: 0,
        tasksErrors: 1,
        tasksUpdated: 3,
        tasksLeftUnclaimed: 0,
        staleTasks: 0,
      });
      expect(result.docs.length).toEqual(3);
    });

    test('should skip tasks where bulkGet returns a newer task document than the bulkPartialUpdate', async () => {
      const store = taskStoreMock.create({ taskManagerId: 'test-test' });
      store.convertToSavedObjectIds.mockImplementation((ids) => ids.map((id) => `task:${id}`));

      const fetchedTasks = [
        mockInstance({ id: `id-1`, taskType: 'report', version: '123' }),
        mockInstance({ id: `id-2`, taskType: 'report', version: '123' }),
        mockInstance({ id: `id-3`, taskType: 'yawn', version: '123' }),
        mockInstance({ id: `id-4`, taskType: 'report', version: '123' }),
      ];

      const { versionMap, docLatestVersions } = getVersionMapsFromTasks(fetchedTasks);
      store.msearch.mockResolvedValueOnce({ docs: fetchedTasks, versionMap });
      store.getDocVersions.mockResolvedValueOnce(docLatestVersions);
      store.bulkPartialUpdate.mockResolvedValueOnce(
        [fetchedTasks[0], fetchedTasks[1], fetchedTasks[2], fetchedTasks[3]].map(
          getPartialUpdateResult
        )
      );
      store.bulkGet.mockResolvedValueOnce([
        asOk({ ...fetchedTasks[0], startedAt: new Date() }),
        asOk({ ...fetchedTasks[1], startedAt: new Date(), version: 'abc' }),
        asOk({ ...fetchedTasks[2], startedAt: new Date() }),
        asOk({ ...fetchedTasks[3], startedAt: new Date() }),
      ]);

      const taskClaiming = new TaskClaiming({
        logger: taskManagerLogger,
        strategy: CLAIM_STRATEGY_MGET,
        definitions: taskDefinitions,
        taskStore: store,
        excludedTaskTypes: [],
        maxAttempts: 2,
        getAvailableCapacity: () => 10,
        taskPartitioner,
      });

      const resultOrErr = await taskClaiming.claimAvailableTasksIfCapacityIsAvailable({
        claimOwnershipUntil: new Date(),
      });

      if (!isOk<ClaimOwnershipResult, FillPoolResult>(resultOrErr)) {
        expect(resultOrErr).toBe(undefined);
      }

      const result = unwrap(resultOrErr) as ClaimOwnershipResult;

      expect(apm.startTransaction).toHaveBeenCalledWith(
        TASK_MANAGER_MARK_AS_CLAIMED,
        TASK_MANAGER_TRANSACTION_TYPE
      );
      expect(mockApmTrans.end).toHaveBeenCalledWith('success');

      expect(taskManagerLogger.debug).toHaveBeenCalledWith(
        'task claimer claimed: 3; stale: 0; conflicts: 1; missing: 0; capacity reached: 0; updateErrors: 0; getErrors: 0;',
        { tags: ['taskClaiming', 'claimAvailableTasksMget'] }
      );
      expect(taskManagerLogger.warn).toHaveBeenCalledWith(
        'Task id-2 was modified during the claiming phase, skipping until the next claiming cycle.',
        { tags: ['taskClaiming', 'claimAvailableTasksMget'] }
      );

      expect(store.msearch.mock.calls[0][0]?.[0]).toMatchObject({
        size: 40,
        seq_no_primary_term: true,
      });
      expect(store.getDocVersions).toHaveBeenCalledWith([
        'task:id-1',
        'task:id-2',
        'task:id-3',
        'task:id-4',
      ]);
      expect(store.bulkPartialUpdate).toHaveBeenCalledTimes(1);
      expect(store.bulkPartialUpdate).toHaveBeenCalledWith([
        {
          id: fetchedTasks[0].id,
          version: fetchedTasks[0].version,
          scheduledAt: fetchedTasks[0].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[1].id,
          version: fetchedTasks[1].version,
          scheduledAt: fetchedTasks[1].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[2].id,
          version: fetchedTasks[2].version,
          scheduledAt: fetchedTasks[2].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[3].id,
          version: fetchedTasks[3].version,
          scheduledAt: fetchedTasks[3].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
      ]);
      expect(store.bulkGet).toHaveBeenCalledWith(['id-1', 'id-2', 'id-3', 'id-4']);

      expect(result.stats).toEqual({
        tasksClaimed: 3,
        tasksConflicted: 1,
        tasksErrors: 0,
        tasksUpdated: 3,
        tasksLeftUnclaimed: 0,
        staleTasks: 0,
      });
      expect(result.docs.length).toEqual(3);
      for (const r of result.docs) {
        expect(r.startedAt).not.toBeNull();
      }
    });

    test('should throw when error when bulk getting all full task docs', async () => {
      const store = taskStoreMock.create({ taskManagerId: 'test-test' });
      store.convertToSavedObjectIds.mockImplementation((ids) => ids.map((id) => `task:${id}`));

      const fetchedTasks = [
        mockInstance({ id: `id-1`, taskType: 'report' }),
        mockInstance({ id: `id-2`, taskType: 'report' }),
        mockInstance({ id: `id-3`, taskType: 'yawn' }),
        mockInstance({ id: `id-4`, taskType: 'report' }),
      ];

      const { versionMap, docLatestVersions } = getVersionMapsFromTasks(fetchedTasks);
      store.msearch.mockResolvedValueOnce({ docs: fetchedTasks, versionMap });
      store.getDocVersions.mockResolvedValueOnce(docLatestVersions);
      store.bulkPartialUpdate.mockResolvedValueOnce(
        [fetchedTasks[0], fetchedTasks[1], fetchedTasks[2], fetchedTasks[3]].map(
          getPartialUpdateResult
        )
      );
      store.bulkGet.mockRejectedValueOnce(new Error('oh no'));

      const taskClaiming = new TaskClaiming({
        logger: taskManagerLogger,
        strategy: CLAIM_STRATEGY_MGET,
        definitions: taskDefinitions,
        taskStore: store,
        excludedTaskTypes: [],
        maxAttempts: 2,
        getAvailableCapacity: () => 10,
        taskPartitioner,
      });

      await expect(() =>
        taskClaiming.claimAvailableTasksIfCapacityIsAvailable({ claimOwnershipUntil: new Date() })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"oh no"`);

      expect(apm.startTransaction).toHaveBeenCalledWith(
        TASK_MANAGER_MARK_AS_CLAIMED,
        TASK_MANAGER_TRANSACTION_TYPE
      );
      expect(mockApmTrans.end).toHaveBeenCalledWith('failure');

      expect(store.msearch.mock.calls[0][0]?.[0]).toMatchObject({
        size: 40,
        seq_no_primary_term: true,
      });
      expect(store.getDocVersions).toHaveBeenCalledWith([
        'task:id-1',
        'task:id-2',
        'task:id-3',
        'task:id-4',
      ]);
      expect(store.bulkPartialUpdate).toHaveBeenCalledTimes(1);
      expect(store.bulkPartialUpdate).toHaveBeenCalledWith([
        {
          id: fetchedTasks[0].id,
          version: fetchedTasks[0].version,
          scheduledAt: fetchedTasks[0].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[1].id,
          version: fetchedTasks[1].version,
          scheduledAt: fetchedTasks[1].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[2].id,
          version: fetchedTasks[2].version,
          scheduledAt: fetchedTasks[2].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[3].id,
          version: fetchedTasks[3].version,
          scheduledAt: fetchedTasks[3].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
      ]);
      expect(store.bulkGet).toHaveBeenCalledWith(['id-1', 'id-2', 'id-3', 'id-4']);
    });

    test('should handle individual errors when bulk updating the task doc', async () => {
      const store = taskStoreMock.create({ taskManagerId: 'test-test' });
      store.convertToSavedObjectIds.mockImplementation((ids) => ids.map((id) => `task:${id}`));

      const fetchedTasks = [
        mockInstance({ id: `id-1`, taskType: 'report' }),
        mockInstance({ id: `id-2`, taskType: 'report' }),
        mockInstance({ id: `id-3`, taskType: 'yawn' }),
        mockInstance({ id: `id-4`, taskType: 'report' }),
      ];

      const { versionMap, docLatestVersions } = getVersionMapsFromTasks(fetchedTasks);
      store.msearch.mockResolvedValueOnce({ docs: fetchedTasks, versionMap });
      store.getDocVersions.mockResolvedValueOnce(docLatestVersions);
      store.bulkPartialUpdate.mockResolvedValueOnce([
        getPartialUpdateResult(fetchedTasks[0]),
        asErr({
          type: 'task',
          id: fetchedTasks[1].id,
          status: 404,
          error: {
            type: 'document_missing_exception',
            reason: '[5]: document missing',
            index_uuid: 'aAsFqTI0Tc2W0LCWgPNrOA',
            shard: '0',
            index: '.kibana_task_manager_8.16.0_001',
          },
        }),
        getPartialUpdateResult(fetchedTasks[2]),
        getPartialUpdateResult(fetchedTasks[3]),
      ]);
      store.bulkGet.mockResolvedValueOnce([
        asOk(fetchedTasks[0]),
        asOk(fetchedTasks[2]),
        asOk(fetchedTasks[3]),
      ]);

      const taskClaiming = new TaskClaiming({
        logger: taskManagerLogger,
        strategy: CLAIM_STRATEGY_MGET,
        definitions: taskDefinitions,
        taskStore: store,
        excludedTaskTypes: [],
        maxAttempts: 2,
        getAvailableCapacity: () => 10,
        taskPartitioner,
      });

      const resultOrErr = await taskClaiming.claimAvailableTasksIfCapacityIsAvailable({
        claimOwnershipUntil: new Date(),
      });

      if (!isOk<ClaimOwnershipResult, FillPoolResult>(resultOrErr)) {
        expect(resultOrErr).toBe(undefined);
      }

      const result = unwrap(resultOrErr) as ClaimOwnershipResult;

      expect(apm.startTransaction).toHaveBeenCalledWith(
        TASK_MANAGER_MARK_AS_CLAIMED,
        TASK_MANAGER_TRANSACTION_TYPE
      );
      expect(mockApmTrans.end).toHaveBeenCalledWith('success');

      expect(taskManagerLogger.debug).toHaveBeenCalledWith(
        'task claimer claimed: 3; stale: 0; conflicts: 0; missing: 0; capacity reached: 0; updateErrors: 1; getErrors: 0;',
        { tags: ['taskClaiming', 'claimAvailableTasksMget'] }
      );
      expect(taskManagerLogger.error).toHaveBeenCalledWith(
        'Error updating task id-2:task during claim: {"type":"document_missing_exception","reason":"[5]: document missing","index_uuid":"aAsFqTI0Tc2W0LCWgPNrOA","shard":"0","index":".kibana_task_manager_8.16.0_001"}',
        { tags: ['taskClaiming', 'claimAvailableTasksMget'] }
      );

      expect(store.msearch.mock.calls[0][0]?.[0]).toMatchObject({
        size: 40,
        seq_no_primary_term: true,
      });
      expect(store.getDocVersions).toHaveBeenCalledWith([
        'task:id-1',
        'task:id-2',
        'task:id-3',
        'task:id-4',
      ]);
      expect(store.bulkPartialUpdate).toHaveBeenCalledTimes(1);
      expect(store.bulkPartialUpdate).toHaveBeenCalledWith([
        {
          id: fetchedTasks[0].id,
          version: fetchedTasks[0].version,
          scheduledAt: fetchedTasks[0].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[1].id,
          version: fetchedTasks[1].version,
          scheduledAt: fetchedTasks[1].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[2].id,
          version: fetchedTasks[2].version,
          scheduledAt: fetchedTasks[2].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[3].id,
          version: fetchedTasks[3].version,
          scheduledAt: fetchedTasks[3].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
      ]);
      expect(store.bulkGet).toHaveBeenCalledWith(['id-1', 'id-3', 'id-4']);

      expect(result.stats).toEqual({
        tasksClaimed: 3,
        tasksConflicted: 0,
        tasksErrors: 1,
        tasksUpdated: 3,
        tasksLeftUnclaimed: 0,
        staleTasks: 0,
      });
      expect(result.docs.length).toEqual(3);
    });

    test('should handle conflict errors when bulk updating the task doc', async () => {
      const store = taskStoreMock.create({ taskManagerId: 'test-test' });
      store.convertToSavedObjectIds.mockImplementation((ids) => ids.map((id) => `task:${id}`));

      const fetchedTasks = [
        mockInstance({ id: `id-1`, taskType: 'report' }),
        mockInstance({ id: `id-2`, taskType: 'report' }),
        mockInstance({ id: `id-3`, taskType: 'yawn' }),
        mockInstance({ id: `id-4`, taskType: 'report' }),
      ];

      const { versionMap, docLatestVersions } = getVersionMapsFromTasks(fetchedTasks);
      store.msearch.mockResolvedValueOnce({ docs: fetchedTasks, versionMap });
      store.getDocVersions.mockResolvedValueOnce(docLatestVersions);
      store.bulkPartialUpdate.mockResolvedValueOnce([
        getPartialUpdateResult(fetchedTasks[0]),
        asErr({
          type: 'task',
          id: fetchedTasks[1].id,
          status: 409,
          error: { type: 'anything', reason: 'some-reason', index: 'some-index' },
        }),
        getPartialUpdateResult(fetchedTasks[2]),
        getPartialUpdateResult(fetchedTasks[3]),
      ]);
      store.bulkGet.mockResolvedValueOnce([
        asOk(fetchedTasks[0]),
        asOk(fetchedTasks[2]),
        asOk(fetchedTasks[3]),
      ]);

      const taskClaiming = new TaskClaiming({
        logger: taskManagerLogger,
        strategy: CLAIM_STRATEGY_MGET,
        definitions: taskDefinitions,
        taskStore: store,
        excludedTaskTypes: [],
        maxAttempts: 2,
        getAvailableCapacity: () => 10,
        taskPartitioner,
      });

      const resultOrErr = await taskClaiming.claimAvailableTasksIfCapacityIsAvailable({
        claimOwnershipUntil: new Date(),
      });

      if (!isOk<ClaimOwnershipResult, FillPoolResult>(resultOrErr)) {
        expect(resultOrErr).toBe(undefined);
      }

      const result = unwrap(resultOrErr) as ClaimOwnershipResult;

      expect(apm.startTransaction).toHaveBeenCalledWith(
        TASK_MANAGER_MARK_AS_CLAIMED,
        TASK_MANAGER_TRANSACTION_TYPE
      );
      expect(mockApmTrans.end).toHaveBeenCalledWith('success');

      expect(taskManagerLogger.debug).toHaveBeenCalledWith(
        'task claimer claimed: 3; stale: 0; conflicts: 1; missing: 0; capacity reached: 0; updateErrors: 0; getErrors: 0;',
        { tags: ['taskClaiming', 'claimAvailableTasksMget'] }
      );
      expect(taskManagerLogger.error).not.toHaveBeenCalled();

      expect(store.msearch.mock.calls[0][0]?.[0]).toMatchObject({
        size: 40,
        seq_no_primary_term: true,
      });
      expect(store.getDocVersions).toHaveBeenCalledWith([
        'task:id-1',
        'task:id-2',
        'task:id-3',
        'task:id-4',
      ]);
      expect(store.bulkPartialUpdate).toHaveBeenCalledTimes(1);
      expect(store.bulkPartialUpdate).toHaveBeenCalledWith([
        {
          id: fetchedTasks[0].id,
          version: fetchedTasks[0].version,
          scheduledAt: fetchedTasks[0].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[1].id,
          version: fetchedTasks[1].version,
          scheduledAt: fetchedTasks[1].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[2].id,
          version: fetchedTasks[2].version,
          scheduledAt: fetchedTasks[2].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[3].id,
          version: fetchedTasks[3].version,
          scheduledAt: fetchedTasks[3].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
      ]);
      expect(store.bulkGet).toHaveBeenCalledWith(['id-1', 'id-3', 'id-4']);

      expect(result.stats).toEqual({
        tasksClaimed: 3,
        tasksConflicted: 1,
        tasksErrors: 0,
        tasksUpdated: 3,
        tasksLeftUnclaimed: 0,
        staleTasks: 0,
      });
      expect(result.docs.length).toEqual(3);
    });

    test('should throw error when error bulk updating all task docs', async () => {
      const store = taskStoreMock.create({ taskManagerId: 'test-test' });
      store.convertToSavedObjectIds.mockImplementation((ids) => ids.map((id) => `task:${id}`));

      const fetchedTasks = [
        mockInstance({ id: `id-1`, taskType: 'report' }),
        mockInstance({ id: `id-2`, taskType: 'report' }),
        mockInstance({ id: `id-3`, taskType: 'yawn' }),
        mockInstance({ id: `id-4`, taskType: 'report' }),
      ];

      const { versionMap, docLatestVersions } = getVersionMapsFromTasks(fetchedTasks);
      store.msearch.mockResolvedValueOnce({ docs: fetchedTasks, versionMap });
      store.getDocVersions.mockResolvedValueOnce(docLatestVersions);
      store.bulkPartialUpdate.mockRejectedValueOnce(new Error('oh no'));
      store.bulkGet.mockResolvedValueOnce([]);

      const taskClaiming = new TaskClaiming({
        logger: taskManagerLogger,
        strategy: CLAIM_STRATEGY_MGET,
        definitions: taskDefinitions,
        taskStore: store,
        excludedTaskTypes: [],
        maxAttempts: 2,
        getAvailableCapacity: () => 10,
        taskPartitioner,
      });

      await expect(() =>
        taskClaiming.claimAvailableTasksIfCapacityIsAvailable({ claimOwnershipUntil: new Date() })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"oh no"`);

      expect(apm.startTransaction).toHaveBeenCalledWith(
        TASK_MANAGER_MARK_AS_CLAIMED,
        TASK_MANAGER_TRANSACTION_TYPE
      );
      expect(mockApmTrans.end).toHaveBeenCalledWith('failure');

      expect(store.msearch.mock.calls[0][0]?.[0]).toMatchObject({
        size: 40,
        seq_no_primary_term: true,
      });
      expect(store.getDocVersions).toHaveBeenCalledWith([
        'task:id-1',
        'task:id-2',
        'task:id-3',
        'task:id-4',
      ]);
      expect(store.bulkPartialUpdate).toHaveBeenCalledTimes(1);
      expect(store.bulkPartialUpdate).toHaveBeenCalledWith([
        {
          id: fetchedTasks[0].id,
          version: fetchedTasks[0].version,
          scheduledAt: fetchedTasks[0].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[1].id,
          version: fetchedTasks[1].version,
          scheduledAt: fetchedTasks[1].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[2].id,
          version: fetchedTasks[2].version,
          scheduledAt: fetchedTasks[2].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          id: fetchedTasks[3].id,
          version: fetchedTasks[3].version,
          scheduledAt: fetchedTasks[3].runAt,
          attempts: 1,
          ownerId: 'test-test',
          retryAt: new Date('1970-01-01T00:05:30.000Z'),
          status: 'running',
          startedAt: new Date('1970-01-01T00:00:00.000Z'),
        },
      ]);
      expect(store.bulkGet).not.toHaveBeenCalled();
    });

    test('it should filter for specific partitions and tasks without partitions', async () => {
      const taskManagerId = uuidv4();
      const definitions = new TaskTypeDictionary(mockLogger());
      definitions.registerTaskDefinitions({
        foo: {
          title: 'foo',
          createTaskRunner: jest.fn(),
        },
        bar: {
          title: 'bar',
          createTaskRunner: jest.fn(),
        },
      });
      const claimedResults = await testClaimAvailableTasks({
        storeOpts: {
          taskManagerId,
          definitions,
        },
        taskClaimingOpts: {},
        claimingOpts: {
          claimOwnershipUntil: new Date(),
        },
      });
      const {
        args: {
          search: [{ query }],
        },
      } = claimedResults;

      expect(query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "bool": Object {
                  "should": Array [
                    Object {
                      "terms": Object {
                        "task.partition": Array [
                          1,
                          3,
                        ],
                      },
                    },
                    Object {
                      "bool": Object {
                        "must_not": Array [
                          Object {
                            "exists": Object {
                              "field": "task.partition",
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
            "must": Array [
              Object {
                "bool": Object {
                  "must": Array [
                    Object {
                      "term": Object {
                        "task.enabled": true,
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "must": Array [
                    Object {
                      "terms": Object {
                        "task.taskType": Array [
                          "foo",
                          "bar",
                        ],
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "should": Array [
                    Object {
                      "bool": Object {
                        "must": Array [
                          Object {
                            "term": Object {
                              "task.status": "idle",
                            },
                          },
                          Object {
                            "range": Object {
                              "task.runAt": Object {
                                "lte": "now",
                              },
                            },
                          },
                        ],
                      },
                    },
                    Object {
                      "bool": Object {
                        "must": Array [
                          Object {
                            "bool": Object {
                              "should": Array [
                                Object {
                                  "term": Object {
                                    "task.status": "running",
                                  },
                                },
                                Object {
                                  "term": Object {
                                    "task.status": "claiming",
                                  },
                                },
                              ],
                            },
                          },
                          Object {
                            "range": Object {
                              "task.retryAt": Object {
                                "lte": "now",
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "must_not": Array [
                    Object {
                      "term": Object {
                        "task.status": "unrecognized",
                      },
                    },
                  ],
                },
              },
            ],
          },
        }
      `);
    });

    test(`it shouldn't filter for partitions when the node has no assigned partitions`, async () => {
      jest.spyOn(taskPartitioner, 'getPartitions').mockResolvedValue([]);
      const taskManagerId = uuidv4();
      const definitions = new TaskTypeDictionary(mockLogger());
      definitions.registerTaskDefinitions({
        foo: {
          title: 'foo',
          createTaskRunner: jest.fn(),
        },
        bar: {
          title: 'bar',
          createTaskRunner: jest.fn(),
        },
      });
      const claimedResults = await testClaimAvailableTasks({
        storeOpts: {
          taskManagerId,
          definitions,
        },
        taskClaimingOpts: {},
        claimingOpts: {
          claimOwnershipUntil: new Date(),
        },
      });
      const {
        args: {
          search: [{ query }],
        },
      } = claimedResults;

      expect(taskManagerLogger.warn).toHaveBeenCalledWith(
        'Background task node "test" has no assigned partitions, claiming against all partitions',
        { tags: ['taskClaiming', 'claimAvailableTasksMget'] }
      );
      expect(query).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "bool": Object {
                  "must_not": Array [
                    Object {
                      "bool": Object {
                        "minimum_should_match": 1,
                        "must": Object {
                          "range": Object {
                            "task.retryAt": Object {
                              "gt": "now",
                            },
                          },
                        },
                        "should": Array [
                          Object {
                            "term": Object {
                              "task.status": "running",
                            },
                          },
                          Object {
                            "term": Object {
                              "task.status": "claiming",
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
            "must": Array [
              Object {
                "bool": Object {
                  "must": Array [
                    Object {
                      "term": Object {
                        "task.enabled": true,
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "must": Array [
                    Object {
                      "terms": Object {
                        "task.taskType": Array [
                          "foo",
                          "bar",
                        ],
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "should": Array [
                    Object {
                      "bool": Object {
                        "must": Array [
                          Object {
                            "term": Object {
                              "task.status": "idle",
                            },
                          },
                          Object {
                            "range": Object {
                              "task.runAt": Object {
                                "lte": "now",
                              },
                            },
                          },
                        ],
                      },
                    },
                    Object {
                      "bool": Object {
                        "must": Array [
                          Object {
                            "bool": Object {
                              "should": Array [
                                Object {
                                  "term": Object {
                                    "task.status": "running",
                                  },
                                },
                                Object {
                                  "term": Object {
                                    "task.status": "claiming",
                                  },
                                },
                              ],
                            },
                          },
                          Object {
                            "range": Object {
                              "task.retryAt": Object {
                                "lte": "now",
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "must_not": Array [
                    Object {
                      "term": Object {
                        "task.status": "unrecognized",
                      },
                    },
                  ],
                },
              },
            ],
          },
        }
      `);
    });

    test(`it should log warning on interval when the node has no assigned partitions`, async () => {
      // Reset the warning timer by advancing more
      fakeTimer.tick(NO_ASSIGNED_PARTITIONS_WARNING_INTERVAL);

      jest.spyOn(taskPartitioner, 'getPartitions').mockResolvedValue([]);
      const taskManagerId = uuidv4();
      const definitions = new TaskTypeDictionary(mockLogger());
      definitions.registerTaskDefinitions({
        foo: {
          title: 'foo',
          createTaskRunner: jest.fn(),
        },
        bar: {
          title: 'bar',
          createTaskRunner: jest.fn(),
        },
      });
      await testClaimAvailableTasks({
        storeOpts: {
          taskManagerId,
          definitions,
        },
        taskClaimingOpts: {},
        claimingOpts: {
          claimOwnershipUntil: new Date(),
        },
      });

      expect(taskManagerLogger.warn).toHaveBeenCalledWith(
        'Background task node "test" has no assigned partitions, claiming against all partitions',
        { tags: ['taskClaiming', 'claimAvailableTasksMget'] }
      );

      taskManagerLogger.warn.mockReset();
      fakeTimer.tick(NO_ASSIGNED_PARTITIONS_WARNING_INTERVAL - 500);

      await testClaimAvailableTasks({
        storeOpts: {
          taskManagerId,
          definitions,
        },
        taskClaimingOpts: {},
        claimingOpts: {
          claimOwnershipUntil: new Date(),
        },
      });

      expect(taskManagerLogger.warn).not.toHaveBeenCalled();

      fakeTimer.tick(500);

      await testClaimAvailableTasks({
        storeOpts: {
          taskManagerId,
          definitions,
        },
        taskClaimingOpts: {},
        claimingOpts: {
          claimOwnershipUntil: new Date(),
        },
      });

      expect(taskManagerLogger.warn).toHaveBeenCalledWith(
        'Background task node "test" has no assigned partitions, claiming against all partitions',
        { tags: ['taskClaiming', 'claimAvailableTasksMget'] }
      );
    });

    test(`it should log a message after the node no longer has no assigned partitions`, async () => {
      // Reset the warning timer by advancing more
      fakeTimer.tick(NO_ASSIGNED_PARTITIONS_WARNING_INTERVAL);

      jest.spyOn(taskPartitioner, 'getPartitions').mockResolvedValue([]);
      const taskManagerId = uuidv4();
      const definitions = new TaskTypeDictionary(mockLogger());
      definitions.registerTaskDefinitions({
        foo: {
          title: 'foo',
          createTaskRunner: jest.fn(),
        },
        bar: {
          title: 'bar',
          createTaskRunner: jest.fn(),
        },
      });
      await testClaimAvailableTasks({
        storeOpts: {
          taskManagerId,
          definitions,
        },
        taskClaimingOpts: {},
        claimingOpts: {
          claimOwnershipUntil: new Date(),
        },
      });

      expect(taskManagerLogger.warn).toHaveBeenCalledWith(
        'Background task node "test" has no assigned partitions, claiming against all partitions',
        { tags: ['taskClaiming', 'claimAvailableTasksMget'] }
      );

      taskManagerLogger.warn.mockReset();
      jest.spyOn(taskPartitioner, 'getPartitions').mockResolvedValue([1, 2, 3]);
      fakeTimer.tick(500);

      await testClaimAvailableTasks({
        storeOpts: {
          taskManagerId,
          definitions,
        },
        taskClaimingOpts: {},
        claimingOpts: {
          claimOwnershipUntil: new Date(),
        },
      });

      expect(taskManagerLogger.warn).not.toHaveBeenCalled();
      expect(taskManagerLogger.info).toHaveBeenCalledWith(
        `Background task node "${taskPartitioner.getPodName()}" now claiming with assigned partitions`,
        { tags: ['taskClaiming', 'claimAvailableTasksMget'] }
      );
    });
  });

  describe('task events', () => {
    function generateTasks(taskManagerId: string) {
      const runAt = new Date();
      const tasks = [
        {
          id: 'claimed-by-id',
          runAt,
          taskType: 'foo',
          schedule: undefined,
          attempts: 0,
          status: TaskStatus.Claiming,
          params: { hello: 'world' },
          state: { baby: 'Henhen' },
          user: 'jimbo',
          scope: ['reporting'],
          ownerId: taskManagerId,
          startedAt: null,
          retryAt: null,
          scheduledAt: new Date(),
          traceparent: 'parent',
        },
        {
          id: 'claimed-by-schedule',
          runAt,
          taskType: 'bar',
          schedule: { interval: '5m' },
          attempts: 2,
          status: TaskStatus.Claiming,
          params: { shazm: 1 },
          state: { henry: 'The 8th' },
          user: 'dabo',
          scope: ['reporting', 'ceo'],
          ownerId: taskManagerId,
          startedAt: null,
          retryAt: null,
          scheduledAt: new Date(),
          traceparent: 'newParent',
        },
        {
          id: 'already-running',
          runAt,
          taskType: 'bar',
          schedule: { interval: '5m' },
          attempts: 2,
          status: TaskStatus.Running,
          params: { shazm: 1 },
          state: { henry: 'The 8th' },
          user: 'dabo',
          scope: ['reporting', 'ceo'],
          ownerId: taskManagerId,
          startedAt: null,
          retryAt: null,
          scheduledAt: new Date(),
          traceparent: '',
        },
      ];

      return { taskManagerId, runAt, tasks };
    }

    function instantiateStoreWithMockedApiResponses({
      taskManagerId = uuidv4(),
      definitions = taskDefinitions,
      getAvailableCapacity = () => 10,
      tasksClaimed,
    }: Partial<Pick<TaskClaimingOpts, 'definitions' | 'getAvailableCapacity'>> & {
      taskManagerId?: string;
      tasksClaimed?: ConcreteTaskInstance[][];
    } = {}) {
      const { runAt, tasks: generatedTasks } = generateTasks(taskManagerId);
      const taskCycles = tasksClaimed ?? [generatedTasks];

      const taskStore = taskStoreMock.create({ taskManagerId });
      taskStore.convertToSavedObjectIds.mockImplementation((ids) => ids.map((id) => `task:${id}`));
      for (const docs of taskCycles) {
        const versionMap = new Map<string, ConcreteTaskInstanceVersion>();
        const docVersions = new Map<string, ConcreteTaskInstanceVersion>();
        for (const doc of docs) {
          const esId = `task:${doc.id}`;
          versionMap.set(doc.id, { esId, seqNo: 42, primaryTerm: 666 });
          docVersions.set(esId, { esId, seqNo: 42, primaryTerm: 666 });
        }
        taskStore.msearch.mockResolvedValueOnce({ docs, versionMap });
        taskStore.getDocVersions.mockResolvedValueOnce(docVersions);
        const updatedDocs = docs.map((doc) => {
          doc = { ...doc, retryAt: null };
          return asOk(doc);
        });
        taskStore.bulkPartialUpdate.mockResolvedValueOnce(updatedDocs);
        taskStore.bulkGet.mockResolvedValueOnce(updatedDocs);
      }

      taskStore.msearch.mockResolvedValue({ docs: [], versionMap: new Map() });
      taskStore.getDocVersions.mockResolvedValue(new Map());
      taskStore.bulkPartialUpdate.mockResolvedValue([]);
      taskStore.bulkGet.mockResolvedValue([]);

      const taskClaiming = new TaskClaiming({
        logger: taskManagerLogger,
        strategy: CLAIM_STRATEGY_MGET,
        definitions,
        excludedTaskTypes: [],
        taskStore,
        maxAttempts: 2,
        getAvailableCapacity,
        taskPartitioner,
      });

      return { taskManagerId, runAt, taskClaiming };
    }

    test('emits an event when a task is succesfully by scheduling', async () => {
      const taskDefs = new TaskTypeDictionary(taskManagerLogger);
      taskDefs.registerTaskDefinitions({
        foo: {
          title: 'foo',
          createTaskRunner: jest.fn(),
        },
        bar: {
          title: 'bar',
          createTaskRunner: jest.fn(),
        },
      });

      const { taskManagerId, runAt, taskClaiming } = instantiateStoreWithMockedApiResponses({
        definitions: taskDefs,
      });

      const promise = taskClaiming.events
        .pipe(
          filter(
            (event: TaskEvent<ConcreteTaskInstance, Error>) => event.id === 'claimed-by-schedule'
          ),
          take(1)
        )
        .toPromise();

      await taskClaiming.claimAvailableTasksIfCapacityIsAvailable({
        claimOwnershipUntil: new Date(),
      });

      const event = await promise;
      expect(event).toMatchObject(
        asTaskClaimEvent(
          'claimed-by-schedule',
          asOk({
            id: 'claimed-by-schedule',
            runAt,
            taskType: 'bar',
            schedule: { interval: '5m' },
            attempts: 2,
            status: 'claiming' as TaskStatus,
            params: { shazm: 1 },
            state: { henry: 'The 8th' },
            user: 'dabo',
            scope: ['reporting', 'ceo'],
            ownerId: taskManagerId,
            startedAt: new Date(),
            retryAt: null,
            scheduledAt: new Date(),
            traceparent: 'newParent',
          }),
          event?.timing
        )
      );
    });
  });
});

function generateFakeTasks(count: number = 1) {
  return _.times(count, (index) => mockInstance({ id: `task:id-${index}` }));
}

function getPartialUpdateResult(task: ConcreteTaskInstance) {
  return asOk({
    id: task.id,
    version: task.version,
    scheduledAt: task.runAt,
    ownerId: 'test-test',
    retryAt: task.runAt,
    status: 'claiming',
  } as PartialConcreteTaskInstance);
}

function mockInstance(instance: Partial<ConcreteTaskInstance> = {}) {
  return Object.assign(
    {
      id: uuidv4(),
      taskType: 'bar',
      sequenceNumber: 32,
      primaryTerm: 32,
      runAt: new Date(),
      scheduledAt: new Date(),
      startedAt: null,
      retryAt: null,
      attempts: 0,
      params: {},
      scope: ['reporting'],
      state: {},
      status: 'idle',
      user: 'example',
      ownerId: null,
      traceparent: '',
    },
    instance
  );
}
