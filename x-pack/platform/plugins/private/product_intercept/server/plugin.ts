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
import type { ConfigSchema } from '../common/config';

type ProductInterceptServerPluginSetup = Pick<
  ProductInterceptTriggerCoreInitDeps,
  'taskManager' | 'cloud'
>;

interface ProductInterceptServerPluginStart {
  taskManager: TaskManagerStartContract;
}

/**
 * @internal
 */
export class ProductInterceptServerPlugin
  implements
    Plugin<object, object, ProductInterceptServerPluginSetup, ProductInterceptServerPluginStart>
{
  private readonly logger: Logger;
  private readonly config: ConfigSchema;
  private productInterceptDialogCore?: ProductInterceptTriggerCore;

  constructor(private initContext: PluginInitializerContext<unknown>) {
    this.logger = initContext.logger.get();
    this.config = initContext.config.get<ConfigSchema>();
  }

  public setup(core: CoreSetup, { taskManager, cloud }: ProductInterceptServerPluginSetup) {
    if (this.config.enabled) {
      this.productInterceptDialogCore = new ProductInterceptTriggerCore(this.initContext, {
        core,
        cloud,
        logger: this.logger,
        taskManager,
      });
    }

    return {};
  }

  public start(core: CoreStart, { taskManager }: ProductInterceptServerPluginStart) {
    void (async () => {
      await this.productInterceptDialogCore?.init({
        taskManager,
      });
    })();

    return {};
  }

  public stop() {}
}
