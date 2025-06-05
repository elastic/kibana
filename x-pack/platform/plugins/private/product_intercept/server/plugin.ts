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
import type { InterceptSetup, InterceptStart } from '@kbn/intercepts-plugin/server';
import { TRIGGER_DEF_ID } from '../common/constants';
import { ServerConfigSchema } from '../common/config';

interface ProductInterceptServerPluginSetup {
  intercepts: InterceptSetup;
}

interface ProductInterceptServerPluginStart {
  intercepts: InterceptStart;
}

/**
 * @internal
 */
export class ProductInterceptServerPlugin
  implements Plugin<object, object, ProductInterceptServerPluginSetup, never>
{
  private readonly logger: Logger;
  private readonly config: ServerConfigSchema;

  constructor(initContext: PluginInitializerContext<unknown>) {
    this.logger = initContext.logger.get();
    this.config = initContext.config.get<ServerConfigSchema>();
  }

  setup(core: CoreSetup, {}: ProductInterceptServerPluginSetup) {
    return {};
  }

  start(core: CoreStart, { intercepts }: ProductInterceptServerPluginStart) {
    if (this.config.enabled) {
      void intercepts.registerTriggerDefinition?.(TRIGGER_DEF_ID, () => {
        this.logger.debug('Registering kibana product trigger definition');
        return { triggerAfter: this.config.interval };
      });
    }

    return {};
  }
}
