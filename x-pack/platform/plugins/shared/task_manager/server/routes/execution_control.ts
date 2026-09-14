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
  Logger,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
  RequestHandlerContext,
  SecurityServiceStart,
} from '@kbn/core/server';
import type { TaskExecutionControlService } from '../execution_control';
import type { TaskTypeDictionary } from '../task_type_dictionary';
import type { TaskExecutionControl } from '../saved_objects/schemas/task_execution_control';

export interface ExecutionControlRouteParams {
  router: IRouter;
  logger: Logger;
  getSecurity: () => Promise<SecurityServiceStart>;
  getExecutionControlService: () => Promise<TaskExecutionControlService>;
  getDefinitions: () => TaskTypeDictionary;
}

const toResponseBody = (state: TaskExecutionControl) => ({
  paused: state.paused,
  paused_task_types: state.paused_task_types,
  updated_at: state.updated_at,
  updated_by: state.updated_by ?? null,
});

export function executionControlRoutes(params: ExecutionControlRouteParams) {
  const { router, logger, getSecurity, getExecutionControlService, getDefinitions } = params;

  const getUsername = async (request: KibanaRequest): Promise<string | undefined> => {
    try {
      const security = await getSecurity();
      return security.authc.getCurrentUser(request)?.username;
    } catch (e) {
      return undefined;
    }
  };

  const validateTaskTypes = (taskTypes: string[]): string[] => {
    const definitions = getDefinitions();
    return taskTypes.filter((type) => !definitions.has(type));
  };

  router.get(
    {
      path: '/internal/task_manager/execution/_status',
      security: {
        authz: {
          requiredPrivileges: [ReservedPrivilegesSet.superuser],
        },
      },
      validate: false,
      options: { access: 'internal' },
    },
    async (
      _context: RequestHandlerContext,
      _req: KibanaRequest,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse> => {
      const service = await getExecutionControlService();
      const state = await service.read();
      return res.ok({ body: toResponseBody(state) });
    }
  );

  router.post(
    {
      path: '/internal/task_manager/execution/_pause',
      security: {
        authz: {
          requiredPrivileges: [ReservedPrivilegesSet.superuser],
        },
      },
      validate: {
        // The body is optional: a bodyless POST (pause everything) arrives as
        // null, so accept null/undefined in addition to a `{ task_types }` object.
        body: schema.maybe(
          schema.nullable(
            schema.object({
              task_types: schema.maybe(
                schema.arrayOf(schema.string({ maxLength: 256 }), { minSize: 1, maxSize: 1000 })
              ),
            })
          )
        ),
      },
      options: { access: 'internal' },
    },
    async (
      _context: RequestHandlerContext,
      req: KibanaRequest<unknown, unknown, { task_types?: string[] } | null | undefined>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse> => {
      const taskTypes = req.body?.task_types;
      if (taskTypes) {
        const unknownTypes = validateTaskTypes(taskTypes);
        if (unknownTypes.length) {
          return res.badRequest({
            body: `Unknown task types: ${unknownTypes.join(', ')}`,
          });
        }
      }

      const service = await getExecutionControlService();
      const username = await getUsername(req);
      const next = await service.update(
        (current) =>
          taskTypes
            ? {
                paused: current.paused,
                pausedTaskTypes: [...current.pausedTaskTypes, ...taskTypes],
              }
            : { paused: true, pausedTaskTypes: current.pausedTaskTypes },
        { username }
      );

      logger.info(
        taskTypes
          ? `Task Manager execution paused for task types [${taskTypes.join(', ')}] by ${
              username ?? 'unknown user'
            }.`
          : `Task Manager execution paused by ${username ?? 'unknown user'}.`
      );
      return res.ok({ body: toResponseBody(next) });
    }
  );

  router.post(
    {
      path: '/internal/task_manager/execution/_resume',
      security: {
        authz: {
          requiredPrivileges: [ReservedPrivilegesSet.superuser],
        },
      },
      validate: {
        // The body is optional: a bodyless POST (resume everything) arrives as
        // null, so accept null/undefined in addition to a `{ task_types }` object.
        body: schema.maybe(
          schema.nullable(
            schema.object({
              task_types: schema.maybe(
                schema.arrayOf(schema.string({ maxLength: 256 }), { minSize: 1, maxSize: 1000 })
              ),
            })
          )
        ),
      },
      options: { access: 'internal' },
    },
    async (
      _context: RequestHandlerContext,
      req: KibanaRequest<unknown, unknown, { task_types?: string[] } | null | undefined>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse> => {
      // Resume only removes entries from the paused set, so — unlike _pause — it
      // does not validate task types: a persisted paused type can outlive its
      // definition (plugin disabled, type removed across an upgrade), and the
      // operator must still be able to clear it.
      const taskTypes = req.body?.task_types;
      const service = await getExecutionControlService();
      const username = await getUsername(req);

      // Track which of the requested types were actually paused, so the log
      // reflects what changed rather than what was requested.
      let removedTaskTypes: string[] = [];
      const next = await service.update(
        (current) => {
          if (!taskTypes) {
            // A full resume clears both the global pause and the paused type list.
            return { paused: false, pausedTaskTypes: [] };
          }
          removedTaskTypes = current.pausedTaskTypes.filter((type) => taskTypes.includes(type));
          return {
            paused: current.paused,
            pausedTaskTypes: current.pausedTaskTypes.filter((type) => !taskTypes.includes(type)),
          };
        },
        { username }
      );

      logger.info(
        !taskTypes
          ? `Task Manager execution resumed by ${username ?? 'unknown user'}.`
          : removedTaskTypes.length
          ? `Task Manager execution resumed for task types [${removedTaskTypes.join(', ')}] by ${
              username ?? 'unknown user'
            }.`
          : `Task Manager execution resume requested by ${
              username ?? 'unknown user'
            }, but none of the requested task types [${taskTypes.join(', ')}] were paused.`
      );
      return res.ok({ body: toResponseBody(next) });
    }
  );
}
