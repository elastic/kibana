/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RequestHandlerContext,
  type CoreSetup,
  type Logger,
  type PluginInitializerContext,
} from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
  IntervalSchedule,
} from '@kbn/task-manager-plugin/server';
import { parseIntervalAsMillisecond } from '@kbn/task-manager-plugin/server/lib/intervals';
import { schema } from '@kbn/config-schema';

interface ProductInterceptTriggerCoreInitDeps {
  core: CoreSetup;
  logger: Logger;
  taskManager: TaskManagerSetupContract;
}

interface ProductInterceptTriggerCoreStartUpArgs {
  taskManager: TaskManagerStartContract;
}

interface ProductInterceptTaskState {
  runs: number;
  firstScheduledAt: ReturnType<Date['toISOString']>;
}

interface ProductInterceptTriggerStatusContext extends RequestHandlerContext {
  triggerInfo: Promise<
    | (ProductInterceptTaskState & {
        interval: IntervalSchedule['interval'];
        runAt: ConcreteTaskInstance['runAt'];
      })
    | null
  >;
}

export class ProductInterceptTriggerCore {
  private readonly core: CoreSetup;
  private readonly logger: Logger;
  private readonly taskManagerSetup: TaskManagerSetupContract;
  private taskManager?: TaskManagerStartContract;
  private readonly isServerless: boolean;

  private readonly taskType = 'productInterceptDialogTrigger';
  // define a scope so we might be able to use this to track if we have already scheduled a task in time past
  private readonly taskScope = 'productInterceptTrigger';

  constructor(
    private readonly ctx: PluginInitializerContext<unknown>,
    { core, logger, taskManager }: ProductInterceptTriggerCoreInitDeps
  ) {
    this.core = core;
    this.logger = logger;
    this.taskManagerSetup = taskManager;
    this.isServerless = this.ctx.env.packageInfo.buildFlavor === 'serverless';

    this.registerTrigger.call(this);
    this.registerRoutes.call(this);
  }

  registerTrigger() {
    this.taskManagerSetup.registerTaskDefinitions({
      [this.taskType]: {
        title: 'Product intercept dialog trigger',
        description: 'Task that triggers the product intercept dialog',
        // To ensure the validity of task state during read and write operations, utilize the stateSchemaByVersion configuration. This functionality validates the state before executing a task. Make sure to define the schema property using the @kbn/config-schema plugin, specifically as an ObjectType (schema.object) at the top level.
        stateSchemaByVersion: {
          1: {
            schema: schema.object({
              runs: schema.number(),
              firstScheduledAt: schema.string(),
            }),
            up: (state) => {
              return {
                runs: state.runs || 0,
                firstScheduledAt: state.firstScheduledAt || new Date().toISOString(),
              };
            },
          },
        },
        createTaskRunner: (context) => {
          return {
            run: async () => {
              this.logger.debug('Product intercept trigger ticker is called!');

              return {
                // updating the state value provides the basis that allows us to infer if the user
                // interacted with the dialog on the last run if there was one on the client
                state: {
                  runs: context.taskInstance.state.runs + 1,
                  firstScheduledAt: context.taskInstance.state.firstScheduledAt,
                },
              };
            },
            cancel: async () => {},
          };
        },
      },
    });
  }

  private async fetchRegisteredTriggerTask() {
    if (!this.taskManager) {
      this.logger.debug('Task manager is not started just yet, skipping task details fetch');
      return;
    }

    const taskManagerQuery = {
      bool: {
        filter: {
          bool: {
            must: [
              {
                term: {
                  'task.scope': this.taskScope,
                },
              },
            ],
          },
        },
      },
    };

    const { docs } = await this.taskManager.fetch({ query: taskManagerQuery, size: 1 });

    return docs[0];
  }

  registerRoutes() {
    this.core.http.registerRouteHandlerContext<ProductInterceptTriggerStatusContext, 'triggerInfo'>(
      'triggerInfo',
      async (ctx, request) => {
        let triggerInfo = null;
        let registeredTaskInstance;

        if ((registeredTaskInstance = await this.fetchRegisteredTriggerTask())) {
          const { runAt, state, schedule } = registeredTaskInstance;

          triggerInfo = {
            runs: state.runs,
            firstScheduledAt: state.firstScheduledAt,
            interval: schedule?.interval!,
            runAt,
          };
        }

        return triggerInfo;
      }
    );

    const router = this.core.http.createRouter<ProductInterceptTriggerStatusContext>();

    router.get(
      {
        path: '/internal/product_intercept/trigger_info',
        validate: false,
        security: {
          authz: {
            enabled: false,
            reason:
              'route is public and provides information about the next product intercept trigger',
          },
        },
      },
      async ({ triggerInfo }, _request, response) => {
        const requestTime = new Date().toISOString();

        const resolvedTriggerInfo = await triggerInfo;

        if (!resolvedTriggerInfo) {
          return response.ok({
            body: {},
          });
        }

        let diff;
        const configuredIntervalInMs = parseIntervalAsMillisecond(resolvedTriggerInfo.interval);
        // determine better heuristics for wether to trigger the dialog if we missed the last run
        const nextTrigger =
          (diff = Date.parse(resolvedTriggerInfo.runAt.toDateString()) - Date.parse(requestTime)) >
          0
            ? diff
            : Math.abs(diff) > configuredIntervalInMs
            ? 0
            : configuredIntervalInMs - Math.abs(diff);

        return response.ok({
          body: {
            runs: resolvedTriggerInfo.runs,
            nextTrigger,
            triggerIntervalInMs: configuredIntervalInMs,
            firstRegisteredAt: resolvedTriggerInfo.firstScheduledAt,
          },
        });
      }
    );
  }

  async init({ taskManager }: ProductInterceptTriggerCoreStartUpArgs) {
    this.taskManager = taskManager;

    const existingTask = await this.fetchRegisteredTriggerTask();

    if (!existingTask) {
      this.logger.debug('No existing trigger task found, scheduling one');

      await this.taskManager.schedule({
        taskType: this.taskType,
        params: {},
        // schedule can come from a config or a user setting
        schedule: { interval: this.isServerless ? '30d' : '30s' },
        state: {
          // set initial state, the up method for task definition, handles the propagation of the state in perpetuity
          runs: 0,
          firstScheduledAt: new Date().toISOString(),
        },
        scope: [this.taskScope],
      });
    }
  }
}
