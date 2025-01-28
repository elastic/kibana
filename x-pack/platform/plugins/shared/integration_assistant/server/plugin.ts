/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Plugin,
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Logger,
  CustomRequestHandlerContext,
} from '@kbn/core/server';
import { MINIMUM_LICENSE_TYPE } from '../common/constants';
import { registerRoutes } from './routes';
import type {
  IntegrationAssistantPluginSetup,
  IntegrationAssistantPluginStart,
  IntegrationAssistantPluginStartDependencies,
  IntegrationAssistantPluginSetupDependencies,
} from './types';
import { ValidateCelTask } from './graphs/cel/validation/validate_task';

export type IntegrationAssistantRouteHandlerContext = CustomRequestHandlerContext<{
  integrationAssistant: {
    getStartServices: CoreSetup<
      IntegrationAssistantPluginStartDependencies,
      IntegrationAssistantPluginStart
    >['getStartServices'];
    isAvailable: () => boolean;
    logger: Logger;
  };
}>;

export class IntegrationAssistantPlugin
  implements
    Plugin<
      IntegrationAssistantPluginSetup,
      IntegrationAssistantPluginStart,
      IntegrationAssistantPluginSetupDependencies,
      IntegrationAssistantPluginStartDependencies
    >
{
  private readonly logger: Logger;
  private isAvailable: boolean;
  private hasLicense: boolean;
  private validateCelTask: ValidateCelTask | undefined;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.isAvailable = true;
    this.hasLicense = false;
  }

  public setup(
    core: CoreSetup<IntegrationAssistantPluginStartDependencies, IntegrationAssistantPluginStart>,
    dependencies: IntegrationAssistantPluginSetupDependencies
  ): IntegrationAssistantPluginSetup {
    core.http.registerRouteHandlerContext<
      IntegrationAssistantRouteHandlerContext,
      'integrationAssistant'
    >('integrationAssistant', () => ({
      getStartServices: core.getStartServices,
      isAvailable: () => this.isAvailable && this.hasLicense,
      logger: this.logger,
    }));
    const router = core.http.createRouter<IntegrationAssistantRouteHandlerContext>();

    this.validateCelTask = new ValidateCelTask({
      logger: this.logger,
      taskManager: dependencies.taskManager,
    });

    this.logger.debug('integrationAssistant api: Setup');

    registerRoutes(router, this.validateCelTask);

    return {
      setIsAvailable: (isAvailable: boolean) => {
        if (!isAvailable) {
          this.isAvailable = false;
        }
      },
    };
  }

  public start(
    coreStart: CoreStart,
    dependencies: IntegrationAssistantPluginStartDependencies
  ): IntegrationAssistantPluginStart {
    this.logger.debug('integrationAssistant api: Started');
    const { licensing } = dependencies;

    licensing.license$.subscribe((license) => {
      this.hasLicense = license.hasAtLeast(MINIMUM_LICENSE_TYPE);
    });

    const esClient = coreStart.elasticsearch.client.asInternalUser;
    // Load the TaskManagerStartContract to the ValidateCelTask
    this.validateCelTask?.startTaskManager(dependencies.taskManager, esClient);

    return {};
  }

  public stop() {}
}
