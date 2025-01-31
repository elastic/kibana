/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CoreSetup, type Logger, type PluginInitializerContext } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import * as Rx from 'rxjs';

interface ProductInterceptDialogCoreInitDeps {
  core: CoreSetup;
  logger: Logger;
  taskManager: TaskManagerSetupContract;
}

interface ProductInterceptDialogCoreStartUpArgs {
  taskManager: TaskManagerStartContract;
}

interface ProductInterceptDialogTriggerContext {}

interface ProductInterceptDialogTriggerTaskResult {
  state: Record<string, unknown>;
}

interface ProductInterceptDialogTriggerConfig {
  runTask: (
    runContext: ProductInterceptDialogTriggerContext
  ) => Promise<ProductInterceptDialogTriggerTaskResult>;
}

// const interceptTriggers: TaskDefinitionRegistry = {
//   productInterceptDialogTrigger: {
//     title: 'Product intercept dialog trigger',
//     description: 'Task that triggers the product intercept dialog',
//   },
// };

export class ProductInterceptDialogCore {
  private readonly core: CoreSetup;
  private readonly logger: Logger;
  private readonly taskManagerSetup: TaskManagerSetupContract;
  private taskManager?: TaskManagerStartContract;
  private readonly start$ = new Rx.ReplaySubject<void>(1);
  private readonly isServerless: boolean;

  private readonly taskType = 'productInterceptDialogTrigger';

  constructor(
    private readonly ctx: PluginInitializerContext<unknown>,
    { core, logger, taskManager }: ProductInterceptDialogCoreInitDeps
  ) {
    this.core = core;
    this.logger = logger;
    this.taskManagerSetup = taskManager;
    this.isServerless = this.ctx.env.packageInfo.buildFlavor === 'serverless';

    this.registerTrigger({
      runTask: async (context: ProductInterceptDialogTriggerContext) => {
        this.logger.debug('Product intercept dialog trigger ticker is called!');
      },
    });
  }

  registerTrigger({ runTask }: ProductInterceptDialogTriggerConfig) {
    this.taskManagerSetup.registerTaskDefinitions({
      [this.taskType]: {
        title: 'Product intercept dialog trigger',
        description: 'Task that triggers the product intercept dialog',
        createTaskRunner: (context: ProductInterceptDialogTriggerContext) => {
          return {
            run: runTask,
            cancel: async () => {},
          };
        },
      },
    });
  }

  async startUp({ taskManager }: ProductInterceptDialogCoreStartUpArgs) {
    this.taskManager = taskManager;

    this.logger.debug('ProductInterceptDialogCore startUp is called!');

    if (this.isServerless) {
      await this.taskManager.schedule({
        taskType: this.taskType,
        params: {},
        interval: '3months',
        state: {},
      });
    }

    // TODO: figure out how to find and remove tasks
    // this.taskManager.fetch({});

    // TODO: explore logic for removing tasks
    // this.taskManager.removeIfExists
  }

  getContract = () => {
    return {
      registerTrigger: this.registerTrigger.bind(this),
    };
  };
}
