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
import { StackConnectorCreator } from './services/ksc_creator';

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
  private stackConnectorCreator?: StackConnectorCreator;

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

    // Create stack connector creator service
    const stackConnectorCreator = new StackConnectorCreator(this.logger);
    this.stackConnectorCreator = stackConnectorCreator;

    // Create workflow creator service (includes optional Onechat tool creation in start)
    const workflowCreator = new WorkflowCreator(
      this.logger,
      workflowsManagement,
      undefined,
      stackConnectorCreator
    );
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
    const { onechat, actions } = plugins ?? {};

    const secretResolver = new SecretResolver(this.logger);

    // Now that start deps are available, wire Onechat into the workflow creator if present
    if (onechat && this.workflowCreator) {
      this.workflowCreator.setOnechat(onechat);
    }

    // Wire actions into the stack connector creator
    if (actions && this.stackConnectorCreator) {
      this.stackConnectorCreator.setActions(actions);
    }

    return {
      secretResolver,
    };
  }
}
