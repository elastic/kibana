/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { PARENT_TASK_TYPE, registerFanOutExampleTasks } from './tasks';

export interface FanOutExampleSetupDeps {
  taskManager: TaskManagerSetupContract;
}

export interface FanOutExampleStartDeps {
  taskManager: TaskManagerStartContract;
}

export const RUN_ROUTE = '/internal/task_manager_fan_out_example/run';

export class TaskManagerFanOutExamplePlugin
  implements Plugin<void, void, FanOutExampleSetupDeps, FanOutExampleStartDeps>
{
  private readonly logger: Logger;

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
  }

  public setup(core: CoreSetup<FanOutExampleStartDeps>, { taskManager }: FanOutExampleSetupDeps) {
    registerFanOutExampleTasks(taskManager, this.logger);

    const router = core.http.createRouter();
    router.post(
      {
        path: RUN_ROUTE,
        security: {
          authz: {
            enabled: false,
            reason: 'Example plugin route, only meant for local development.',
          },
        },
        validate: {
          body: schema.nullable(
            schema.object({
              id: schema.maybe(schema.string({ maxLength: 128 })),
            })
          ),
        },
        options: { access: 'internal' },
      },
      async (_context, request, response) => {
        const [, { taskManager: taskManagerStart }] = await core.getStartServices();
        const id = request.body?.id ?? `fan-out-example-${Date.now()}`;
        const task = await taskManagerStart.schedule({
          id,
          taskType: PARENT_TASK_TYPE,
          params: {},
          state: {},
        });
        return response.ok({ body: { id: task.id, taskType: task.taskType, status: task.status } });
      }
    );
  }

  public start() {}

  public stop() {}
}
