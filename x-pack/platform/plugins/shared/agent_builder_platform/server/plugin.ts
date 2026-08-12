/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { registerContextEngineAgentBuilder } from '@kbn/context-engine-plugin/server';
import type { PluginConfig } from './config';
import type {
  PluginSetupDependencies,
  PluginStartDependencies,
  AgentBuilderPlatformPluginSetup,
  AgentBuilderPlatformPluginStart,
} from './types';
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

    // Context Engine ↔ Agent Builder bridge (server half): register the CE `ai_index` attachment +
    // its read-only tool. `context_engine` never imports `agentBuilder`; we pull its setup contract
    // here. Reads the caller's capabilities so the tool can enforce the workflows-read privilege.
    if (setupDeps.contextEngine) {
      const { contextEngine } = setupDeps;
      registerContextEngineAgentBuilder({
        agentBuilder: setupDeps.agentBuilder,
        getWorkflowsApi: () => contextEngine.getWorkflowsApi(),
        getCapabilities: async (request) => {
          const [coreStart] = await coreSetup.getStartServices();
          return coreStart.capabilities.resolveCapabilities(request, {
            capabilityPath: ['workflowsManagement.readWorkflow'],
          });
        },
      });
      this.logger.debug('Registered Context Engine ai_index attachment + read tool');
    }
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
