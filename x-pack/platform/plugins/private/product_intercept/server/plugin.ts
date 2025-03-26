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
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { ProductInterceptTriggerCore } from './core';
import type { ServerConfigSchema } from '../common/config';

interface ProductInterceptServerPluginSetup {
  cloud: CloudSetup;
}

/**
 * @internal
 */
export class ProductInterceptServerPlugin
  implements Plugin<object, object, ProductInterceptServerPluginSetup, never>
{
  private readonly logger: Logger;
  private readonly config: ServerConfigSchema;
  private readonly productInterceptCore?: ProductInterceptTriggerCore;

  constructor(private initContext: PluginInitializerContext<unknown>) {
    this.logger = initContext.logger.get();
    this.config = initContext.config.get<ServerConfigSchema>();

    if (this.config.enabled) {
      this.productInterceptCore = new ProductInterceptTriggerCore();
    }
  }

  public setup(core: CoreSetup, { cloud }: ProductInterceptServerPluginSetup) {
    this.productInterceptCore?.setup(core, this.logger, {
      interceptTriggerInterval: this.config.interval,
      kibanaVersion: this.initContext.env.packageInfo.version,
      isCloudDeployment: cloud.isCloudEnabled,
    });

    return {};
  }

  public async start(core: CoreStart) {
    await this.productInterceptCore?.start(core).catch((err) => {
      this.logger.error(err);
    });

    return {};
  }

  public stop() {}
}
