/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type {
  IRouter,
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandlerContext,
} from '@kbn/core/server';
import { ReservedPrivilegesSet } from '@kbn/core/server';
import type { IntervalSchedule, RruleSchedule } from '@kbn/response-ops-scheduling-types';
import type { InstanceTaskCost } from '../task';
import type { TaskManagerStartContract } from '../plugin';

const NOOP_TASK_TYPE = 'task_manager:noop';

export { NOOP_TASK_TYPE };

const taskSchema = schema.object({
  task: schema.object({
    taskType: schema.string(),
    id: schema.maybe(schema.string()),
    enabled: schema.boolean({ defaultValue: true }),
    params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
    state: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
    scope: schema.maybe(schema.arrayOf(schema.string())),
    schedule: schema.maybe(
      schema.oneOf([
        schema.object({
          interval: schema.string(),
        }),
        schema.object({
          rrule: schema.object({
            dtstart: schema.maybe(schema.string()),
            freq: schema.number(),
            interval: schema.number(),
            tzid: schema.string({ defaultValue: 'UTC' }),
            byhour: schema.maybe(schema.arrayOf(schema.number({ min: 0, max: 23 }))),
            byminute: schema.maybe(schema.arrayOf(schema.number({ min: 0, max: 59 }))),
            byweekday: schema.maybe(schema.arrayOf(schema.number({ min: 1, max: 7 }))),
            bymonthday: schema.maybe(schema.arrayOf(schema.number({ min: 1, max: 31 }))),
          }),
        }),
      ])
    ),
    timeoutOverride: schema.maybe(schema.string()),
    cost: schema.maybe(
      schema.oneOf([schema.literal('tiny'), schema.literal('normal'), schema.literal('extralarge')])
    ),
  }),
});

export const scheduleRoute = (
  router: IRouter,
  getStartContract: () => TaskManagerStartContract | undefined
) => {
  router.post(
    {
      path: '/internal/task_manager/schedule',
      security: {
        authz: {
          requiredPrivileges: [ReservedPrivilegesSet.superuser],
        },
      },
      validate: {
        body: taskSchema,
      },
    },
    async (_context: RequestHandlerContext, req: KibanaRequest, res: KibanaResponseFactory) => {
      const startContract = getStartContract();
      if (!startContract) {
        return res.customError({
          statusCode: 503,
          body: { message: 'Task Manager has not started yet' },
        });
      }

      const { task } = req.body as {
        task: {
          taskType: string;
          id?: string;
          enabled?: boolean;
          params: Record<string, unknown>;
          state: Record<string, unknown>;
          scope?: string[];
          schedule?: IntervalSchedule | RruleSchedule;
          timeoutOverride?: string;
          cost?: InstanceTaskCost;
        };
      };

      const taskResult = await startContract.schedule(task, { request: req });

      return res.ok({ body: taskResult });
    }
  );
};
