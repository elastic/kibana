/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

export type ConnectorEventsBridgeSetupDeps = Record<string, never>;

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

  setup(_core: CoreSetup<ConnectorEventsBridgeStartDeps>, _deps: ConnectorEventsBridgeSetupDeps) {
    this.logger.debug('connectorEventsBridge loaded');
    return {};
  }

  start() {
    return {};
  }
}
