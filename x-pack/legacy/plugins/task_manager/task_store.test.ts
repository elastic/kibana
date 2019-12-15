/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import sinon from 'sinon';
import uuid from 'uuid';
import { TaskDictionary, TaskDefinition, TaskInstance, TaskStatus } from './task';
import { FetchOpts, StoreOpts, OwnershipClaimingOpts, TaskStore } from './task_store';
// Task manager uses an unconventional directory structure so the linter marks this as a violation, server files should
// be moved under task_manager/server/
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { savedObjectsClientMock } from 'src/core/server/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SavedObjectsSerializer, SavedObjectsSchema, SavedObjectAttributes } from 'src/core/server';

const taskDefinitions: TaskDictionary<TaskDefinition> = {
  report: {
    type: 'report',
    title: '',
    createTaskRunner: jest.fn(),
  },
  dernstraight: {
    type: 'dernstraight',
    title: '',
    createTaskRunner: jest.fn(),
  },
  yawn: {
    type: 'yawn',
    title: '',
    createTaskRunner: jest.fn(),
  },
};

const savedObjectsClient = savedObjectsClientMock.create();
const serializer = new SavedObjectsSerializer(new SavedObjectsSchema());

beforeEach(() => jest.resetAllMocks());

const mockedDate = new Date('2019-02-12T21:01:22.479Z');
(global as any).Date = class Date {
  constructor() {
    return mockedDate;
  }
  static now() {
    return mockedDate.getTime();
  }
};

describe('TaskStore', () => {
  describe('schedule', () => {
    async function testSchedule(task: TaskInstance) {
      const callCluster = jest.fn();
      savedObjectsClient.create.mockImplementation(
        async (type: string, attributes: SavedObjectAttributes) => ({
          id: 'testid',
          type,
          attributes,
          references: [],
          version: '123',
        })
      );
      const store = new TaskStore({
        index: 'tasky',
        taskManagerId: '',
        serializer,
        callCluster,
        maxAttempts: 2,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
      });
      const result = await store.schedule(task);

      expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);

      return result;
    }

    test('serializes the params and state', async () => {
      const task = {
        id: 'id',
        params: { hello: 'world' },
        state: { foo: 'bar' },
        taskType: 'report',
      };
      const result = await testSchedule(task);

      expect(savedObjectsClient.create).toHaveBeenCalledWith(
        'task',
        {
          attempts: 0,
          interval: undefined,
          params: '{"hello":"world"}',
          retryAt: null,
          runAt: '2019-02-12T21:01:22.479Z',
          scheduledAt: '2019-02-12T21:01:22.479Z',
          scope: undefined,
          startedAt: null,
          state: '{"foo":"bar"}',
          status: 'idle',
          taskType: 'report',
          user: undefined,
        },
        {
          id: 'id',
          refresh: false,
        }
      );

      expect(result).toEqual({
        id: 'testid',
        attempts: 0,
        interval: undefined,
        params: { hello: 'world' },
        retryAt: null,
        runAt: mockedDate,
        scheduledAt: mockedDate,
        scope: undefined,
        startedAt: null,
        state: { foo: 'bar' },
        status: 'idle',
        taskType: 'report',
        user: undefined,
        version: '123',
      });
    });

    test('returns a concrete task instance', async () => {
      const task = {
        params: { hello: 'world' },
        state: { foo: 'bar' },
        taskType: 'report',
      };
      const result = await testSchedule(task);

      expect(result).toMatchObject({
        ...task,
        id: 'testid',
      });
    });

    test('sets runAt to now if not specified', async () => {
      await testSchedule({ taskType: 'dernstraight', params: {}, state: {} });
      expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
      const attributes = savedObjectsClient.create.mock.calls[0][1];
      expect(new Date(attributes.runAt as string).getTime()).toEqual(mockedDate.getTime());
    });

    test('ensures params and state are not null', async () => {
      await testSchedule({ taskType: 'yawn' } as any);
      expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
      const attributes = savedObjectsClient.create.mock.calls[0][1];
      expect(attributes.params).toEqual('{}');
      expect(attributes.state).toEqual('{}');
    });

    test('errors if the task type is unknown', async () => {
      await expect(testSchedule({ taskType: 'nope', params: {}, state: {} })).rejects.toThrow(
        /Unsupported task type "nope"/i
      );
    });
  });

  describe('fetch', () => {
    async function testFetch(opts?: FetchOpts, hits: any[] = []) {
      const callCluster = sinon.spy(async (name: string, params?: any) => ({ hits: { hits } }));
      const store = new TaskStore({
        index: 'tasky',
        taskManagerId: '',
        serializer,
        callCluster,
        maxAttempts: 2,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
      });

      const result = await store.fetch(opts);

      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWith(callCluster, 'search');

      return {
        result,
        args: callCluster.args[0][1],
      };
    }

    test('empty call filters by type, sorts by runAt and id', async () => {
      const { args } = await testFetch();
      expect(args).toMatchObject({
        index: 'tasky',
        body: {
          sort: [{ 'task.runAt': 'asc' }, { _id: 'desc' }],
          query: { term: { type: 'task' } },
        },
      });
    });

    test('allows custom queries', async () => {
      const { args } = await testFetch({
        query: {
          term: { 'task.taskType': 'bar' },
        },
      });

      expect(args).toMatchObject({
        body: {
          query: {
            bool: {
              must: [{ term: { type: 'task' } }, { term: { 'task.taskType': 'bar' } }],
            },
          },
        },
      });
    });

    test('sorts by id if custom sort does not have an id sort in it', async () => {
      const { args } = await testFetch({
        sort: [{ 'task.taskType': 'desc' }],
      });

      expect(args).toMatchObject({
        body: {
          sort: [{ 'task.taskType': 'desc' }, { _id: 'desc' }],
        },
      });
    });

    test('allows custom sort by id', async () => {
      const { args } = await testFetch({
        sort: [{ _id: 'asc' }],
      });

      expect(args).toMatchObject({
        body: {
          sort: [{ _id: 'asc' }],
        },
      });
    });

    test('allows specifying pagination', async () => {
      const now = new Date();
      const searchAfter = [now, '143243sdafa32'];
      const { args } = await testFetch({
        searchAfter,
      });

      expect(args).toMatchObject({
        body: {
          search_after: searchAfter,
        },
      });
    });

    test('returns paginated tasks', async () => {
      const runAt = new Date();
      const { result } = await testFetch(undefined, [
        {
          _id: 'aaa',
          _source: {
            type: 'task',
            task: {
              runAt,
              taskType: 'foo',
              interval: undefined,
              attempts: 0,
              status: 'idle',
              params: '{ "hello": "world" }',
              state: '{ "baby": "Henhen" }',
              user: 'jimbo',
              scope: ['reporting'],
            },
          },
          sort: ['a', 1],
        },
        {
          _id: 'bbb',
          _source: {
            type: 'task',
            task: {
              runAt,
              taskType: 'bar',
              interval: '5m',
              attempts: 2,
              status: 'running',
              params: '{ "shazm": 1 }',
              state: '{ "henry": "The 8th" }',
              user: 'dabo',
              scope: ['reporting', 'ceo'],
            },
          },
          sort: ['b', 2],
        },
      ]);

      expect(result).toEqual({
        docs: [
          {
            attempts: 0,
            id: 'aaa',
            interval: undefined,
            params: { hello: 'world' },
            runAt,
            scheduledAt: mockedDate,
            scope: ['reporting'],
            state: { baby: 'Henhen' },
            status: 'idle',
            taskType: 'foo',
            user: 'jimbo',
            retryAt: undefined,
            startedAt: undefined,
          },
          {
            attempts: 2,
            id: 'bbb',
            interval: '5m',
            params: { shazm: 1 },
            runAt,
            scheduledAt: mockedDate,
            scope: ['reporting', 'ceo'],
            state: { henry: 'The 8th' },
            status: 'running',
            taskType: 'bar',
            user: 'dabo',
            retryAt: undefined,
            startedAt: undefined,
          },
        ],
        searchAfter: ['b', 2],
      });
    });
  });

  describe('claimAvailableTasks', () => {
    async function testClaimAvailableTasks({
      opts = {},
      hits = generateFakeTasks(1),
      claimingOpts,
    }: {
      opts: Partial<StoreOpts>;
      hits?: any[];
      claimingOpts: OwnershipClaimingOpts;
    }) {
      const versionConflicts = 2;
      const callCluster = sinon.spy(async (name: string, params?: any) =>
        name === 'updateByQuery'
          ? {
              total: hits.length + versionConflicts,
              updated: hits.length,
              version_conflicts: versionConflicts,
            }
          : { hits: { hits } }
      );
      const store = new TaskStore({
        callCluster,
        maxAttempts: 2,
        definitions: taskDefinitions,
        serializer,
        savedObjectsRepository: savedObjectsClient,
        taskManagerId: '',
        index: '',
        ...opts,
      });

      const result = await store.claimAvailableTasks(claimingOpts);

      sinon.assert.calledTwice(callCluster);
      sinon.assert.calledWithMatch(callCluster, 'updateByQuery', { max_docs: claimingOpts.size });
      sinon.assert.calledWithMatch(callCluster, 'search', { body: { size: claimingOpts.size } });

      return {
        result,
        args: Object.assign({}, ...callCluster.args.map(([name, args]) => ({ [name]: args }))),
      };
    }

    test('it returns normally with no tasks when the index does not exist.', async () => {
      const callCluster = sinon.spy(async (name: string, params?: any) => ({
        total: 0,
        updated: 0,
      }));
      const store = new TaskStore({
        index: 'tasky',
        taskManagerId: '',
        serializer,
        callCluster,
        definitions: taskDefinitions,
        maxAttempts: 2,
        savedObjectsRepository: savedObjectsClient,
      });
      const { docs } = await store.claimAvailableTasks({
        claimOwnershipUntil: new Date(),
        size: 10,
      });
      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWithMatch(callCluster, 'updateByQuery', {
        ignoreUnavailable: true,
        max_docs: 10,
      });
      expect(docs.length).toBe(0);
    });

    test('it filters claimed tasks down by supported types, maxAttempts, status, and runAt', async () => {
      const maxAttempts = _.random(2, 43);
      const customMaxAttempts = _.random(44, 100);
      const {
        args: {
          updateByQuery: {
            body: { query },
          },
        },
      } = await testClaimAvailableTasks({
        opts: {
          maxAttempts,
          definitions: {
            foo: {
              type: 'foo',
              title: '',
              createTaskRunner: jest.fn(),
            },
            bar: {
              type: 'bar',
              title: '',
              maxAttempts: customMaxAttempts,
              createTaskRunner: jest.fn(),
            },
          },
        },
        claimingOpts: { claimOwnershipUntil: new Date(), size: 10 },
      });
      expect(query).toMatchObject({
        bool: {
          must: [
            { term: { type: 'task' } },
            {
              bool: {
                must: [
                  {
                    bool: {
                      should: [
                        {
                          bool: {
                            must: [
                              { term: { 'task.status': 'idle' } },
                              { range: { 'task.runAt': { lte: 'now' } } },
                            ],
                          },
                        },
                        {
                          bool: {
                            must: [
                              {
                                bool: {
                                  should: [
                                    { term: { 'task.status': 'running' } },
                                    { term: { 'task.status': 'claiming' } },
                                  ],
                                },
                              },
                              { range: { 'task.retryAt': { lte: 'now' } } },
                            ],
                          },
                        },
                      ],
                    },
                  },
                  {
                    bool: {
                      should: [
                        { exists: { field: 'task.interval' } },
                        {
                          bool: {
                            must: [
                              { term: { 'task.taskType': 'foo' } },
                              {
                                range: {
                                  'task.attempts': {
                                    lt: maxAttempts,
                                  },
                                },
                              },
                            ],
                          },
                        },
                        {
                          bool: {
                            must: [
                              { term: { 'task.taskType': 'bar' } },
                              {
                                range: {
                                  'task.attempts': {
                                    lt: customMaxAttempts,
                                  },
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      });
    });

    test('it claims tasks by setting their ownerId, status and retryAt', async () => {
      const taskManagerId = uuid.v1();
      const claimOwnershipUntil = new Date(Date.now());
      const {
        args: {
          updateByQuery: {
            body: { script },
          },
        },
      } = await testClaimAvailableTasks({
        opts: {
          taskManagerId,
        },
        claimingOpts: {
          claimOwnershipUntil,
          size: 10,
        },
      });
      expect(script).toMatchObject({
        source: `ctx._source.task.ownerId=params.ownerId; ctx._source.task.status=params.status; ctx._source.task.retryAt=params.retryAt;`,
        lang: 'painless',
        params: {
          ownerId: taskManagerId,
          retryAt: claimOwnershipUntil,
          status: 'claiming',
        },
      });
    });

    test('it returns task objects', async () => {
      const taskManagerId = uuid.v1();
      const claimOwnershipUntil = new Date(Date.now());
      const runAt = new Date();
      const tasks = [
        {
          _id: 'aaa',
          _source: {
            type: 'task',
            task: {
              runAt,
              taskType: 'foo',
              interval: undefined,
              attempts: 0,
              status: 'idle',
              params: '{ "hello": "world" }',
              state: '{ "baby": "Henhen" }',
              user: 'jimbo',
              scope: ['reporting'],
              ownerId: taskManagerId,
            },
          },
          _seq_no: 1,
          _primary_term: 2,
          sort: ['a', 1],
        },
        {
          _id: 'bbb',
          _source: {
            type: 'task',
            task: {
              runAt,
              taskType: 'bar',
              interval: '5m',
              attempts: 2,
              status: 'running',
              params: '{ "shazm": 1 }',
              state: '{ "henry": "The 8th" }',
              user: 'dabo',
              scope: ['reporting', 'ceo'],
              ownerId: taskManagerId,
            },
          },
          _seq_no: 3,
          _primary_term: 4,
          sort: ['b', 2],
        },
      ];
      const {
        result: { docs },
        args: {
          search: {
            body: { query },
          },
        },
      } = await testClaimAvailableTasks({
        opts: {
          taskManagerId,
        },
        claimingOpts: {
          claimOwnershipUntil,
          size: 10,
        },
        hits: tasks,
      });

      expect(query.bool.must).toContainEqual({
        bool: {
          must: [
            {
              term: {
                'task.ownerId': taskManagerId,
              },
            },
            { term: { 'task.status': 'claiming' } },
          ],
        },
      });

      expect(docs).toMatchObject([
        {
          attempts: 0,
          id: 'aaa',
          interval: undefined,
          params: { hello: 'world' },
          runAt,
          scope: ['reporting'],
          state: { baby: 'Henhen' },
          status: 'idle',
          taskType: 'foo',
          user: 'jimbo',
          ownerId: taskManagerId,
        },
        {
          attempts: 2,
          id: 'bbb',
          interval: '5m',
          params: { shazm: 1 },
          runAt,
          scope: ['reporting', 'ceo'],
          state: { henry: 'The 8th' },
          status: 'running',
          taskType: 'bar',
          user: 'dabo',
          ownerId: taskManagerId,
        },
      ]);
    });
  });

  describe('update', () => {
    test('refreshes the index, handles versioning', async () => {
      const task = {
        runAt: mockedDate,
        scheduledAt: mockedDate,
        startedAt: null,
        retryAt: null,
        id: 'task:324242',
        params: { hello: 'world' },
        state: { foo: 'bar' },
        taskType: 'report',
        attempts: 3,
        status: 'idle' as TaskStatus,
        version: '123',
        ownerId: null,
      };

      savedObjectsClient.update.mockImplementation(
        async (type: string, id: string, attributes: SavedObjectAttributes) => {
          return {
            id,
            type,
            attributes,
            references: [],
            version: '123',
          };
        }
      );

      const store = new TaskStore({
        index: 'tasky',
        taskManagerId: '',
        serializer,
        callCluster: jest.fn(),
        maxAttempts: 2,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
      });

      const result = await store.update(task);

      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        'task',
        task.id,
        {
          attempts: task.attempts,
          interval: undefined,
          params: JSON.stringify(task.params),
          retryAt: null,
          runAt: task.runAt.toISOString(),
          scheduledAt: mockedDate.toISOString(),
          scope: undefined,
          startedAt: null,
          state: JSON.stringify(task.state),
          status: task.status,
          taskType: task.taskType,
          user: undefined,
          ownerId: null,
        },
        { version: '123', refresh: false }
      );

      expect(result).toEqual({
        ...task,
        interval: undefined,
        retryAt: null,
        scope: undefined,
        startedAt: null,
        user: undefined,
        version: '123',
      });
    });
  });

  describe('remove', () => {
    test('removes the task with the specified id', async () => {
      const id = `id-${_.random(1, 20)}`;
      const callCluster = jest.fn();
      const store = new TaskStore({
        index: 'tasky',
        taskManagerId: '',
        serializer,
        callCluster,
        maxAttempts: 2,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
      });
      const result = await store.remove(id);
      expect(result).toBeUndefined();
      expect(savedObjectsClient.delete).toHaveBeenCalledWith('task', id);
    });
  });
});

function generateFakeTasks(count: number = 1) {
  return _.times(count, () => ({
    _id: 'aaa',
    _source: {
      type: 'task',
      task: {},
    },
    _seq_no: _.random(1, 5),
    _primary_term: _.random(1, 5),
    sort: ['a', _.random(1, 5)],
  }));
}
