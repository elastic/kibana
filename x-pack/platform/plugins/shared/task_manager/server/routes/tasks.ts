/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ReservedPrivilegesSet } from '@kbn/core/server';
import type {
  IRouter,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
  RequestHandlerContext,
} from '@kbn/core/server';
import type { TaskStore } from '../task_store';
import type { TaskTypeDictionary } from '../task_type_dictionary';
import type { ConcreteTaskInstance } from '../task';
import type {
  GetTaskResponse,
  ListTasksResponse,
  TaskTypesResponse,
} from '../../common/observability';
import {
  MAX_TASKS_PAGE_SIZE,
  TASKS_ROUTE,
  TASK_ROUTE,
  TASK_TYPES_ROUTE,
} from '../../common/observability';
import { toTaskDetails, toTaskNode } from './lib/task_node';

export interface TasksRoutesParams {
  router: IRouter;
  getTaskStore: () => Promise<TaskStore>;
  definitions: TaskTypeDictionary;
}

const security = {
  authz: {
    requiredPrivileges: [ReservedPrivilegesSet.superuser],
  },
};

const listQuerySchema = schema.object({
  /** Comma-separated task statuses; every status when omitted. */
  status: schema.maybe(schema.string({ maxLength: 256 })),
  task_type: schema.maybe(schema.string({ maxLength: 256 })),
  /** Exact task id, or the root id (prefix) of a tree. */
  id: schema.maybe(schema.string({ maxLength: 1024 })),
  size: schema.number({ defaultValue: 200, min: 1, max: MAX_TASKS_PAGE_SIZE }),
  /** Also return the rest of every tree a matched task belongs to. */
  include_trees: schema.boolean({ defaultValue: true }),
});

type ListQuery = typeof listQuerySchema.type;

const splitCsv = (value?: string): string[] =>
  (value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

const buildListQuery = ({ status, task_type: taskType, id }: ListQuery) => {
  const filter: object[] = [];
  const statuses = splitCsv(status);
  if (statuses.length) {
    filter.push({ terms: { 'task.status': statuses } });
  }
  if (taskType) {
    filter.push({ term: { 'task.taskType': taskType } });
  }
  if (id) {
    // `_id` does not support prefix queries; an exact id match plus a prefix on the linkage
    // fields finds a task or a whole tree by its root id.
    filter.push({
      bool: {
        should: [
          { ids: { values: [`task:${id}`] } },
          { prefix: { 'task.rootId': id } },
          { prefix: { 'task.parentId': id } },
        ],
        minimum_should_match: 1,
      },
    });
  }
  return filter.length ? { bool: { filter } } : { match_all: {} };
};

/**
 * Loads every member of the trees the matched tasks belong to, so the page can show a running
 * child under its waiting parent even when the parent did not match the filter.
 */
const completeTrees = async (
  taskStore: TaskStore,
  matched: ConcreteTaskInstance[]
): Promise<ConcreteTaskInstance[]> => {
  const rootIds = new Set<string>();
  for (const task of matched) {
    if (task.rootId) {
      rootIds.add(task.rootId);
    } else if (task.hasChildren) {
      rootIds.add(task.id);
    }
  }
  if (!rootIds.size) {
    return [];
  }

  const ids = [...rootIds];
  const [roots, { docs: descendants }] = await Promise.all([
    taskStore.bulkGetWithoutApiKeys(ids),
    taskStore.search(
      {
        query: { terms: { 'task.rootId': ids } },
        size: MAX_TASKS_PAGE_SIZE,
        sort: [{ 'task.depth': 'asc' }, { 'task.runAt': 'asc' }],
      },
      true
    ),
  ]);
  return [...roots, ...descendants];
};

/**
 * Registers the read-only routes behind the "Background tasks" page.
 */
export function tasksRoutes({ router, getTaskStore, definitions }: TasksRoutesParams) {
  router.get(
    {
      path: TASKS_ROUTE,
      security,
      validate: { query: listQuerySchema },
      options: { access: 'internal' },
    },
    async (
      _context: RequestHandlerContext,
      req: KibanaRequest<unknown, ListQuery>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<ListTasksResponse>> => {
      const taskStore = await getTaskStore();
      const { size, include_trees: includeTrees } = req.query;

      const { docs: matched } = await taskStore.search(
        {
          query: buildListQuery(req.query),
          size,
          sort: [{ 'task.runAt': 'desc' }],
        },
        true
      );

      const byId = new Map(matched.map((task) => [task.id, toTaskNode(task, true)]));
      if (includeTrees) {
        for (const task of await completeTrees(taskStore, matched)) {
          if (!byId.has(task.id)) {
            byId.set(task.id, toTaskNode(task, false));
          }
        }
      }

      return res.ok({
        body: {
          tasks: [...byId.values()],
          matched: matched.length,
          truncated: matched.length >= size,
        },
      });
    }
  );

  router.get(
    {
      path: `${TASK_ROUTE}/{id}`,
      security,
      validate: { params: schema.object({ id: schema.string({ maxLength: 1024 }) }) },
      options: { access: 'internal' },
    },
    async (
      _context: RequestHandlerContext,
      req: KibanaRequest<{ id: string }>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<GetTaskResponse>> => {
      const taskStore = await getTaskStore();
      const [task] = await taskStore.bulkGetWithoutApiKeys([req.params.id]);
      if (!task) {
        return res.notFound({ body: { message: `Task "${req.params.id}" not found` } });
      }
      return res.ok({ body: { task: toTaskDetails(task) } });
    }
  );

  router.get(
    {
      path: TASK_TYPES_ROUTE,
      security,
      validate: false,
      options: { access: 'internal' },
    },
    async (
      _context: RequestHandlerContext,
      _req: KibanaRequest,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<TaskTypesResponse>> => {
      return res.ok({ body: { task_types: [...definitions.getAllTypes()].sort() } });
    }
  );
}
