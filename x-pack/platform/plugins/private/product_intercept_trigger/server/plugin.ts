/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Plugin,
  type CoreSetup,
  type CoreStart,
  type PluginInitializerContext,
  type Logger,
} from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { ProductInterceptTriggerCore, type ProductInterceptTriggerCoreInitDeps } from './core';

type ProductInterceptDialogPluginSetup = Pick<
  ProductInterceptTriggerCoreInitDeps,
  'taskManager' | 'cloud'
>;

interface ProductInterceptDialogPluginStart {
  taskManager: TaskManagerStartContract;
}

/**
 * @internal
 */
export class ProductInterceptDialogPlugin
  implements
    Plugin<object, object, ProductInterceptDialogPluginSetup, ProductInterceptDialogPluginStart>
{
  private readonly logger: Logger;
  private productInterceptDialogCore?: ProductInterceptTriggerCore;

  constructor(private initContext: PluginInitializerContext<unknown>) {
    this.logger = initContext.logger.get();
  }

  public setup(core: CoreSetup, { taskManager, cloud }) {
    this.productInterceptDialogCore = new ProductInterceptTriggerCore(this.initContext, {
      core,
      cloud,
      logger: this.logger,
      taskManager,
    });

    return {};
  }

  public start(core: CoreStart, { taskManager }) {
    void (async () => {
      await this.productInterceptDialogCore?.init({
        taskManager,
      });
    })();

    return {};
  }

  public stop() {}
}
