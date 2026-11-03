/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { PluginConfig } from './config';
import type {
  PluginSetupDependencies,
  PluginStartDependencies,
  AgentBuilderPlatformPluginSetup,
  AgentBuilderPlatformPluginStart,
} from './types';
import { registerAgentBuilderPlatform } from './register_agent_builder';
import { createConnectorSmlType } from './sml_types/connector';
import { createConnectorLifecycleHandler } from './connector_lifecycle/connector_lifecycle_handler';
import { setAgentBuilderDashboard } from './dashboard/install_dashboard';

export class AgentBuilderPlatformPlugin
  implements
    Plugin<
      AgentBuilderPlatformPluginSetup,
      AgentBuilderPlatformPluginStart,
      PluginSetupDependencies,
      PluginStartDependencies
    >
{
  private logger: Logger;
  private readonly isServerless: boolean;

  constructor(context: PluginInitializerContext<PluginConfig>) {
    this.logger = context.logger.get();
    this.isServerless = context.env.packageInfo.buildFlavor === 'serverless';
  }

  setup(
    coreSetup: CoreSetup<PluginStartDependencies, AgentBuilderPlatformPluginStart>,
    setupDeps: PluginSetupDependencies
  ): AgentBuilderPlatformPluginSetup {
    registerAgentBuilderPlatform({
      agentBuilder: setupDeps.agentBuilder,
      coreSetup,
      organizationId: setupDeps.cloud?.organizationId,
      isServerless: this.isServerless,
      logger: this.logger,
      getFilesPlugin: async () => {
        const [, startDeps] = await coreSetup.getStartServices();
        return startDeps.files;
      },
      getAgentsStart: async () => {
        const [, startDeps] = await coreSetup.getStartServices();
        return startDeps.agentBuilder.agents;
      },
      getActionsStart: async () => {
        const [, startDeps] = await coreSetup.getStartServices();
        return startDeps.actions;
      },
    });

    const connectorSmlType = createConnectorSmlType({
      getActionSavedObjectsClient: async (request) => {
        const [coreStart] = await coreSetup.getStartServices();
        return coreStart.savedObjects.getScopedClient(request, { includedHiddenTypes: ['action'] });
      },
      logger: this.logger.get('sml-connector'),
    });
    setupDeps.agentBuilderSml.registerType(connectorSmlType);

    const connectorLifecycleHandler = createConnectorLifecycleHandler({
      logger: this.logger.get('connector-lifecycle'),
      getStartServices: coreSetup.getStartServices,
    });

    setupDeps.actions.registerConnectorLifecycleListener({
      connectorTypes: '*',
      onPostCreate: connectorLifecycleHandler.onPostCreate,
      onPostDelete: connectorLifecycleHandler.onPostDelete,
    });

    return {};
  }

  start(coreStart: CoreStart): AgentBuilderPlatformPluginStart {
    return {
      tracingFeatures: {
        setDashboard: ({ enabled, spaceId }) =>
          setAgentBuilderDashboard(coreStart, enabled, spaceId, this.logger),
      },
    };
  }

  stop() {}
}
