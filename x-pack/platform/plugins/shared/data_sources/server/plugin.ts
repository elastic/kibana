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
import { BulkDeleteTask } from './tasks/bulk_delete_task';
import { registerExtractionConfigSavedObject } from './extraction_config/saved_object';
import { createExtractStepDefinition } from './steps/extract/extract_step';
import { getExtractionConfig, DEFAULT_EXTRACTION_CONFIG } from './extraction_config';
import { registerExtractionConfigRoutes } from './routes/extraction_config_routes';

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

    // Register saved objects types
    setupSavedObjects(savedObjects);
    registerExtractionConfigSavedObject(savedObjects);

    // Register the extraction.extract custom workflow step
    if (plugins.workflowsExtensions) {
      const getGlobalConfig = async () => {
        try {
          const [coreStart] = await core.getStartServices();
          const soClient = coreStart.savedObjects.createInternalRepository();
          return await getExtractionConfig({
            get: soClient.get.bind(soClient),
          } as Parameters<typeof getExtractionConfig>[0]);
        } catch {
          return DEFAULT_EXTRACTION_CONFIG;
        }
      };

      const workflowRunner = {
        getWorkflow: workflowsManagement.management.getWorkflow.bind(
          workflowsManagement.management
        ),
        runWorkflow: workflowsManagement.management.runWorkflow.bind(
          workflowsManagement.management
        ),
        getWorkflowExecution: workflowsManagement.management.getWorkflowExecution.bind(
          workflowsManagement.management
        ),
      };

      plugins.workflowsExtensions.registerStepDefinition(
        createExtractStepDefinition(getGlobalConfig, workflowRunner)
      );
    }

    // Register bulk delete task if Task Manager is available
    if (plugins.taskManager) {
      new BulkDeleteTask({
        core,
        logFactory: this.logger,
        taskManager: plugins.taskManager,
        workflowManagement: plugins.workflowsManagement,
      });
    }

    // Register HTTP routes
    const router = core.http.createRouter();
    registerRoutes({
      router,
      logger: this.logger,
      getStartServices: core.getStartServices,
      workflowManagement: workflowsManagement,
    });

    registerExtractionConfigRoutes({
      router,
      getStartServices: core.getStartServices,
      workflowManagement: workflowsManagement,
    });

    return {};
  }

  start(core: CoreStart, plugins: DataSourcesServerStartDependencies): DataSourcesServerStart {
    return {};
  }
}
