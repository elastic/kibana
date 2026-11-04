/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

import { registerWorkflowsConnectorEventEmitter } from './register_workflows_connector_event_emitter';

export interface ConnectorEventsBridgeSetupDeps {
  actions: ActionsPluginSetupContract;
}

export interface ConnectorEventsBridgeStartDeps {
  workflowsExtensions?: WorkflowsExtensionsServerPluginStart;
}

export class ConnectorEventsBridgePlugin
  implements Plugin<{}, {}, ConnectorEventsBridgeSetupDeps, ConnectorEventsBridgeStartDeps>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  setup(
    core: CoreSetup<ConnectorEventsBridgeStartDeps>,
    { actions }: ConnectorEventsBridgeSetupDeps
  ) {
    const configUtils = actions.getActionsConfigurationUtilities();
    if (!configUtils.isInboundEventsEnabled()) {
      return {};
    }

    this.logger.info('Inbound events enabled; registering connector event emitter');
    registerWorkflowsConnectorEventEmitter({
      actions,
      getWorkflowsExtensionsStart: async () => {
        const [, startPlugins] = await core.getStartServices();
        return startPlugins.workflowsExtensions;
      },
    });

    return {};
  }

  start() {
    return {};
  }
}
