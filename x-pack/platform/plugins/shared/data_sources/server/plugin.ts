/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
} from '@kbn/core/server';
import { registerRoutes } from './routes';
import { registerDataSources } from './sources';
import type {
  DataSourcesServerSetup,
  DataSourcesServerSetupDependencies,
  DataSourcesServerStart,
  DataSourcesServerStartDependencies,
} from './types';
import { registerUISettings } from './register';
import { setupSavedObjects } from './saved_objects';

export class DataSourcesServerPlugin
  implements
    Plugin<
      DataSourcesServerSetup,
      DataSourcesServerStart,
      DataSourcesServerSetupDependencies,
      DataSourcesServerStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    core: CoreSetup<DataSourcesServerStartDependencies>,
    plugins: DataSourcesServerSetupDependencies
  ): DataSourcesServerSetup {
    const { savedObjects, uiSettings } = core;
    const { dataCatalog, workflowsManagement } = plugins;

    // Register WorkplaceAI-owned data sources
    registerDataSources(dataCatalog);

    registerUISettings({ uiSettings });

    // Register saved objects type
    setupSavedObjects(savedObjects);

    // Register HTTP routes
    const router = core.http.createRouter();
    registerRoutes({
      router,
      logger: this.logger,
      getStartServices: core.getStartServices,
      workflowManagement: workflowsManagement,
    });

    return {};
  }

  start(core: CoreStart, plugins: DataSourcesServerStartDependencies): DataSourcesServerStart {
    return {};
  }
}
