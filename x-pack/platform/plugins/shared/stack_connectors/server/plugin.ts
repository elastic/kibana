/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import type { AlertingServerSetup } from '@kbn/alerting-plugin/server';
import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { ExperimentalFeatures } from '../common/experimental_features';
import { parseExperimentalConfigValue } from '../common/experimental_features';
import type { ConfigSchema as StackConnectorsConfigType } from './config';
import { getWorkflowsConnectorAdapter, registerConnectorTypes } from './connector_types';
import { getWellKnownEmailServiceRoute, validSlackApiChannelsRoute } from './routes';

export interface ConnectorsPluginsSetup {
  actions: ActionsPluginSetupContract;
  alerting: AlertingServerSetup;
}

export interface ConnectorsPluginsStart {
  actions: ActionsPluginSetupContract;
}

export class StackConnectorsPlugin
  implements Plugin<void, void, ConnectorsPluginsSetup, ConnectorsPluginsStart>
{
  private readonly logger: Logger;
  private config: StackConnectorsConfigType;
  readonly experimentalFeatures: ExperimentalFeatures;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.config = context.config.get();
    this.experimentalFeatures = parseExperimentalConfigValue(this.config.enableExperimental || []);
  }

  public setup(core: CoreSetup<ConnectorsPluginsStart>, plugins: ConnectorsPluginsSetup) {
    const router = core.http.createRouter();
    const { actions, alerting } = plugins;

    const awsSesConfig = actions.getActionsConfigurationUtilities().getAwsSesConfig();
    getWellKnownEmailServiceRoute(router, awsSesConfig);
    validSlackApiChannelsRoute(router, actions.getActionsConfigurationUtilities(), this.logger);

    registerConnectorTypes({
      actions,
      publicBaseUrl: core.http.basePath.publicBaseUrl,
      experimentalFeatures: this.experimentalFeatures,
    });

    // Register workflows connector adapter for system action
    alerting.registerConnectorAdapter(getWorkflowsConnectorAdapter());
  }

  public start(core: CoreStart, deps: ConnectorsPluginsStart) {}
  public stop() {}
}
