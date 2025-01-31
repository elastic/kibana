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
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { ProductInterceptDialogCore } from './core';

interface ProductInterceptDialogPluginSetup {
  taskManager: TaskManagerSetupContract;
}

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
  private productInterceptDialogCore?: ProductInterceptDialogCore;

  constructor(private initContext: PluginInitializerContext<unknown>) {
    this.logger = initContext.logger.get();
  }

  public setup(core: CoreSetup, { taskManager }) {
    this.productInterceptDialogCore = new ProductInterceptDialogCore(this.initContext, {
      core,
      logger: this.logger,
      taskManager,
    });

    return this.productInterceptDialogCore.getContract();
  }

  public start(core: CoreStart, { taskManager }) {
    void (async () => {
      await this.productInterceptDialogCore?.startUp({
        taskManager,
      });
    })();

    return {};
  }

  public stop() {}
}
