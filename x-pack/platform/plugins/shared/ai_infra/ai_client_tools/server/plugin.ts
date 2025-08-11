/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { AIClientToolsBaseConfig } from './config';
import {
  AIClientToolsBaseSetupContract,
  AIClientToolsBaseStartContract,
  AIClientToolsBaseSetupDependencies,
  AIClientToolsBaseStartDependencies,
  InternalServices,
} from './types';
import { registerRoutes } from './routes';

export class AIClientToolsBasePlugin
  implements
    Plugin<
      AIClientToolsBaseSetupContract,
      AIClientToolsBaseStartContract,
      AIClientToolsBaseSetupDependencies,
      AIClientToolsBaseStartDependencies
    >
{
  private logger: Logger;
  private internalServices?: InternalServices;

  constructor(private readonly context: PluginInitializerContext<AIClientToolsBaseConfig>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<AIClientToolsBaseStartDependencies, AIClientToolsBaseStartContract>,
    { taskManager }: AIClientToolsBaseSetupDependencies
  ): AIClientToolsBaseSetupContract {
    const getServices = () => {
      if (!this.internalServices) {
        throw new Error('getServices called before #start');
      }
      return this.internalServices;
    };

    const router = coreSetup.http.createRouter();
    registerRoutes({
      router,
      getServices,
    });

    return {};
  }

  start(
    core: CoreStart,
    { licensing, taskManager }: AIClientToolsBaseStartDependencies
  ): AIClientToolsBaseStartContract {
    return {};
  }
}
