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
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { parseIntervalAsMillisecond } from '@kbn/task-manager-plugin/server/lib/intervals';
import { schema } from '@kbn/config-schema';
import semverLt from 'semver/functions/lt';
import { TRIGGER_API_ENDPOINT } from '../common/constants';

export interface ProductInterceptTriggerCoreInitDeps {
  core: CoreSetup;
  logger: Logger;
  taskManager: TaskManagerSetupContract;
  cloud: CloudSetup;
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
  private readonly isCloudDeployment: boolean;

  private readonly taskType = 'productInterceptDialogTrigger';
  // define a scope so we might be able to use this to track if we have already scheduled a task in time past
  private readonly taskScope = 'productInterceptTrigger';

  constructor(
    private readonly ctx: PluginInitializerContext<unknown>,
    { core, logger, taskManager, cloud }: ProductInterceptTriggerCoreInitDeps
  ) {
    this.core = core;
    this.logger = logger;
    this.taskManagerSetup = taskManager;
    this.isServerless = this.ctx.env.packageInfo.buildFlavor === 'serverless';
    this.isCloudDeployment = cloud.isCloudEnabled;

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
              /**
               * The kibana version the task was installed on
               */
              installedOn: schema.string(),
              firstScheduledAt: schema.string(),
            }),
            up: (state) => {
              return {
                runs: state.runs || 0,
                installedOn: state.installedOn || this.ctx.env.packageInfo.version,
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
                // leverage flag to delete a task if already scheduled, through user configuration
                shouldDeleteTask: false,
                // updating the state value provides the basis that allows us to infer if the user
                // interacted with the dialog on the last run if there was one on the client
                state: {
                  installedOn: context.taskInstance.state.installedOn,
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
      async () => {
        let triggerInfo: ProductInterceptTriggerStatusContext['triggerInfo'] extends Promise<
          infer I
        >
          ? I
          : never = null;

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
        path: TRIGGER_API_ENDPOINT,
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
        const resolvedTriggerInfo = await triggerInfo;

        if (!resolvedTriggerInfo) {
          return response.ok({
            body: {},
          });
        }

        if (_request.headers['if-none-match'] === String(resolvedTriggerInfo.runs)) {
          return response.notModified({});
        }

        let diff;
        const configuredIntervalInMs = parseIntervalAsMillisecond(resolvedTriggerInfo.interval);
        // determine better heuristics for wether to trigger the dialog if we missed the last run
        const responseExpirationValueInMs =
          (diff =
            Date.parse(resolvedTriggerInfo.runAt.toDateString()) -
            Date.parse(new Date().toISOString())) > 0
            ? diff
            : Math.abs(diff) > configuredIntervalInMs
            ? 0
            : configuredIntervalInMs - Math.abs(diff);

        return response.ok({
          headers: {
            etag: String(resolvedTriggerInfo.runs),
            age: String(responseExpirationValueInMs),
            'cache-control': `private, max-age=${configuredIntervalInMs}, immutable`,
          },
          body: {
            runs: resolvedTriggerInfo.runs,
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
    let shouldReschedule = false;

    if (
      this.isCloudDeployment &&
      existingTask &&
      semverLt(existingTask.state.installedOn, this.ctx.env.packageInfo.version)
    ) {
      // if we are in a cloud deployment, we check on init if the existing task version matches the current version, else we can infer that an upgrade happened
      this.logger.debug(
        'Product intercept dialog task was installed on a different version, rescheduling'
      );
      await this.taskManager.remove(existingTask.id);

      shouldReschedule = true;
    }

    // ideally we would only schedule the task if it's not already scheduled and the kibana is configured to use the product intercept dialog
    if (!existingTask || shouldReschedule) {
      this.logger.debug('No existing trigger task found, scheduling one');

      await this.taskManager.schedule({
        taskType: this.taskType,
        params: {},
        // schedule can come from a config or a user setting
        schedule: { interval: this.isServerless ? '30d' : '30s' },
        state: {
          // set initial state, the up method for task definition, handles the propagation of the state in perpetuity
          runs: 0,
          installedOn: this.ctx.env.packageInfo.version,
          firstScheduledAt: new Date().toISOString(),
        },
        enabled: true,
        scope: [this.taskScope],
      });
    }
  }
}
