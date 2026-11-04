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
import type { ConcreteTaskInstance } from '../task';
import type { TaskTreeResponse } from '../../common/observability';
import { MAX_TASKS_PAGE_SIZE, TASK_TREE_ROUTE } from '../../common/observability';
import { rollupOutcomes, toTaskNode } from './lib/task_node';

export interface TaskTreeRouteParams {
  router: IRouter;
  getTaskStore: () => Promise<TaskStore>;
}

export type { TaskTreeResponse };

export const buildTaskTreeResponse = (
  rootId: string,
  root: ConcreteTaskInstance | undefined,
  descendants: ConcreteTaskInstance[]
): TaskTreeResponse => {
  const nodes = [...(root ? [root] : []), ...descendants].map((task) => toTaskNode(task));
  return { root_id: rootId, nodes, rollup: rollupOutcomes(nodes) };
};

/**
 * Returns a task and every sub-task under it, with a roll-up of their outcomes.
 */
export function taskTreeRoute({ router, getTaskStore }: TaskTreeRouteParams) {
  router.get(
    {
      path: `${TASK_TREE_ROUTE}/{rootId}`,
      security: {
        authz: {
          requiredPrivileges: [ReservedPrivilegesSet.superuser],
        },
      },
      validate: {
        params: schema.object({
          rootId: schema.string({ maxLength: 1024 }),
        }),
      },
      options: { access: 'internal' },
    },
    async (
      _context: RequestHandlerContext,
      req: KibanaRequest<{ rootId: string }>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse> => {
      const { rootId } = req.params;
      const taskStore = await getTaskStore();

      const [root] = await taskStore.bulkGetWithoutApiKeys([rootId]);
      const { docs: descendants } = await taskStore.search(
        {
          query: { term: { 'task.rootId': rootId } },
          size: MAX_TASKS_PAGE_SIZE,
          sort: [{ 'task.depth': 'asc' }, { 'task.runAt': 'asc' }],
        },
        true
      );

      if (!root && !descendants.length) {
        return res.notFound({ body: { message: `No task tree with root "${rootId}"` } });
      }

      return res.ok({ body: buildTaskTreeResponse(rootId, root, descendants) });
    }
  );
}
