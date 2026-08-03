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
import { registerContextEngineAgentBuilder } from '@kbn/context-engine-plugin/server';
import { registerTools } from './tools';
import { registerAttachmentTypes } from './attachment_types';
import { registerSkills } from './skills';
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

  constructor(context: PluginInitializerContext<PluginConfig>) {
    this.logger = context.logger.get();
  }

  setup(
    coreSetup: CoreSetup<PluginStartDependencies, AgentBuilderPlatformPluginStart>,
    setupDeps: PluginSetupDependencies
  ): AgentBuilderPlatformPluginSetup {
    registerTools({
      coreSetup,
      setupDeps,
    });
    registerAttachmentTypes({
      coreSetup,
      setupDeps,
    });
    const getActionsStart = async () => {
      const [, startDeps] = await coreSetup.getStartServices();
      return startDeps.actions;
    };
    registerSkills(setupDeps.agentBuilder, getActionsStart);

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

    // Context Engine registers its agent-builder surface here: it loads before
    // Agent Builder and so cannot register directly without a dependency cycle.
    if (setupDeps.contextEngine) {
      registerContextEngineAgentBuilder({
        agentBuilder: setupDeps.agentBuilder,
        getAiIndexService: setupDeps.contextEngine.getAiIndexService,
        getWorkflowsApi: setupDeps.contextEngine.getWorkflowsApi,
      });
    }

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
