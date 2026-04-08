/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  SmlPluginSetup,
  SmlPluginStart,
  SmlSetupDependencies,
  SmlStartDependencies,
} from './types';
import {
  createSmlService,
  registerSmlCrawlerTaskDefinition,
  scheduleSmlCrawlerTasks,
} from './services';
import type { SmlServiceInstance, SmlService } from './services';

export class SmlPlugin
  implements Plugin<SmlPluginSetup, SmlPluginStart, SmlSetupDependencies, SmlStartDependencies>
{
  private logger: Logger;
  private smlServiceInstance: SmlServiceInstance;
  private smlService?: SmlService;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.smlServiceInstance = createSmlService();
  }

  setup(
    coreSetup: CoreSetup<SmlStartDependencies, SmlPluginStart>,
    { taskManager }: SmlSetupDependencies
  ): SmlPluginSetup {
    const smlSetup = this.smlServiceInstance.setup({
      logger: this.logger.get('services'),
    });

    registerSmlCrawlerTaskDefinition({
      taskManager,
      getCrawlerDeps: async () => {
        const [coreStart] = await coreSetup.getStartServices();
        if (!this.smlService) {
          throw new Error('SML service not started yet');
        }
        return {
          smlService: this.smlService,
          elasticsearch: coreStart.elasticsearch,
          savedObjects: coreStart.savedObjects,
          uiSettings: coreStart.uiSettings,
          logger: this.logger.get('services'),
        };
      },
    });

    return {
      registerType: smlSetup.registerType,
    };
  }

  start(coreStart: CoreStart, { taskManager, security }: SmlStartDependencies): SmlPluginStart {
    this.smlService = this.smlServiceInstance.start({
      logger: this.logger.get('services'),
      securityAuthz: security?.authz,
    });

    const smlService = this.smlService;

    scheduleSmlCrawlerTasks({
      taskManager,
      smlService,
      logger: this.logger.get('services'),
    }).catch((error) => {
      this.logger.error(`Failed to schedule SML crawler tasks: ${error.message}`);
    });

    return smlService;
  }

  stop() {}
}
