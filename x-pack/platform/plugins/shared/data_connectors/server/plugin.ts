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
  Plugin,
  Logger,
} from '@kbn/core/server';
import type {
  DataConnectorsServerSetup,
  DataConnectorsServerSetupDependencies,
  DataConnectorsServerStart,
  DataConnectorsServerStartDependencies,
} from './types';
import { registerUISettings } from './register';
import { setupSavedObjects } from './saved_objects';
import { WorkflowCreator } from './services/workflow_creator';
import { registerConnectorRoutes } from './routes';
import { SecretResolver } from './services/secret_resolver';

export class DataConnectorsServerPlugin
  implements
    Plugin<
      DataConnectorsServerSetup,
      DataConnectorsServerStart,
      DataConnectorsServerSetupDependencies,
      DataConnectorsServerStartDependencies
    >
{
  private readonly logger: Logger;
  private workflowCreator?: WorkflowCreator;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    core: CoreSetup,
    plugins: DataConnectorsServerSetupDependencies
  ): DataConnectorsServerSetup {
    const { savedObjects, uiSettings } = core;
    const { encryptedSavedObjects, workflowsManagement } = plugins;

    registerUISettings({ uiSettings });

    // Register saved objects with encrypted saved objects support
    setupSavedObjects(savedObjects, encryptedSavedObjects);

    // Create workflow creator service (includes optional Onechat tool creation in start)
    const workflowCreator = new WorkflowCreator(this.logger, workflowsManagement);
    this.workflowCreator = workflowCreator;

    // Register HTTP routes with workflow creator
    const router = core.http.createRouter();
    registerConnectorRoutes(router, workflowCreator, this.logger);

    return {};
  }
  start(
    core: CoreStart,
    plugins: DataConnectorsServerStartDependencies
  ): DataConnectorsServerStart {
    const { onechat } = plugins ?? {};

    const secretResolver = new SecretResolver(this.logger);

    // Now that start deps are available, wire Onechat into the workflow creator if present
    if (onechat && this.workflowCreator) {
      this.workflowCreator.setOnechat(onechat);
    }

    return {
      secretResolver,
    };
  }
}
