/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { taskStoreMock } from '../task_store.mock';
import type { ConcreteTaskInstance } from '../task';
import { TaskStatus } from '../task';
import { buildTaskTreeResponse, taskTreeRoute } from './task_tree';

const task = (overrides: Partial<ConcreteTaskInstance> = {}): ConcreteTaskInstance => ({
  id: 'root',
  taskType: 'parentType',
  scheduledAt: new Date('2020-01-01T00:00:00.000Z'),
  runAt: new Date('2020-01-01T00:05:00.000Z'),
  startedAt: null,
  retryAt: null,
  attempts: 0,
  params: {},
  state: {},
  status: TaskStatus.Waiting,
  ownerId: null,
  ...overrides,
});

const children = [
  task({
    id: 'root:a',
    taskType: 'childType',
    parentId: 'root',
    rootId: 'root',
    depth: 1,
    childKey: 'a',
    status: TaskStatus.Done,
    attempts: 1,
    startedAt: new Date('2020-01-01T00:01:00.000Z'),
  }),
  task({
    id: 'root:b',
    taskType: 'childType',
    parentId: 'root',
    rootId: 'root',
    depth: 1,
    childKey: 'b',
    status: TaskStatus.Failed,
    attempts: 3,
  }),
  task({
    id: 'root:a:leaf',
    taskType: 'leafType',
    parentId: 'root:a',
    rootId: 'root',
    depth: 2,
    childKey: 'leaf',
    status: TaskStatus.Running,
  }),
];

describe('taskTreeRoute', () => {
  test('registers an internal superuser-only route', () => {
    const router = httpServiceMock.createRouter();
    taskTreeRoute({ router, getTaskStore: jest.fn() });

    const [config] = router.get.mock.calls[0];
    expect(config.path).toBe('/internal/task_manager/_tree/{rootId}');
    expect(config.options).toEqual({ access: 'internal' });
    expect(config.security).toEqual({ authz: { requiredPrivileges: ['superuser'] } });
  });

  test('returns the root, its descendants, and an outcome roll-up', async () => {
    const router = httpServiceMock.createRouter();
    const store = taskStoreMock.create();
    store.bulkGetWithoutApiKeys.mockResolvedValue([task()]);
    store.search.mockResolvedValue({ docs: children, versionMap: new Map() });
    taskTreeRoute({ router, getTaskStore: async () => store });

    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({}, { params: { rootId: 'root' } }, ['ok']);

    const response = await handler(context, req, res);

    expect(store.bulkGetWithoutApiKeys).toHaveBeenCalledWith(['root']);
    expect(store.search).toHaveBeenCalledWith(
      expect.objectContaining({ query: { term: { 'task.rootId': 'root' } } }),
      true
    );
    expect(response).toEqual({
      body: {
        root_id: 'root',
        nodes: [
          expect.objectContaining({
            id: 'root',
            parent_id: null,
            depth: 0,
            child_key: null,
            outcome: 'inProgress',
          }),
          expect.objectContaining({
            id: 'root:a',
            parent_id: 'root',
            depth: 1,
            child_key: 'a',
            outcome: 'done',
            attempts: 1,
            started_at: '2020-01-01T00:01:00.000Z',
          }),
          expect.objectContaining({ id: 'root:b', outcome: 'failed', attempts: 3 }),
          expect.objectContaining({ id: 'root:a:leaf', parent_id: 'root:a', depth: 2 }),
        ],
        rollup: {
          total: 4,
          inProgress: 2,
          done: 1,
          failed: 1,
          cancelled: 0,
          missing: 0,
          unrecognized: 0,
        },
      },
    });
  });

  test('still lists the children when the root is gone', async () => {
    const router = httpServiceMock.createRouter();
    const store = taskStoreMock.create();
    store.bulkGetWithoutApiKeys.mockResolvedValue([]);
    store.search.mockResolvedValue({ docs: children, versionMap: new Map() });
    taskTreeRoute({ router, getTaskStore: async () => store });

    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({}, { params: { rootId: 'root' } }, ['ok']);

    const response = await handler(context, req, res);

    expect(response).toMatchObject({ body: { root_id: 'root', rollup: { total: 3 } } });
  });

  test('returns 404 when neither the root nor any descendant exists', async () => {
    const router = httpServiceMock.createRouter();
    const store = taskStoreMock.create();
    store.bulkGetWithoutApiKeys.mockResolvedValue([]);
    store.search.mockResolvedValue({ docs: [], versionMap: new Map() });
    taskTreeRoute({ router, getTaskStore: async () => store });

    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({}, { params: { rootId: 'nope' } }, [
      'notFound',
    ]);

    const response = await handler(context, req, res);

    expect(response).toEqual({ body: { message: 'No task tree with root "nope"' } });
  });
});

describe('buildTaskTreeResponse', () => {
  test('counts every node in the roll-up, including the root', () => {
    const { rollup, nodes } = buildTaskTreeResponse('root', task(), children);
    expect(nodes).toHaveLength(4);
    expect(rollup.total).toBe(4);
    expect(rollup.inProgress + rollup.done + rollup.failed + rollup.cancelled).toBe(4);
  });

  test('serializes dates and defaults the linkage fields of the root', () => {
    const { nodes } = buildTaskTreeResponse('root', task(), []);
    expect(nodes).toEqual([
      {
        id: 'root',
        task_type: 'parentType',
        status: 'waiting',
        outcome: 'inProgress',
        parent_id: null,
        root_id: null,
        depth: 0,
        child_key: null,
        has_children: false,
        attempts: 0,
        run_at: '2020-01-01T00:05:00.000Z',
        scheduled_at: '2020-01-01T00:00:00.000Z',
        started_at: null,
        retry_at: null,
        owner_id: null,
        enabled: true,
        recurring: false,
        wake_requested: false,
        cancel_requested: false,
        matched: true,
      },
    ]);
  });
});
