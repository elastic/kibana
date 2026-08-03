/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  CoreStart,
  Logger,
} from '@kbn/core/server';
import type { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { registerConnectorTypes } from './connector_types';
import { validSlackApiChannelsRoute, getWellKnownEmailServiceRoute } from './routes';
import type { ExperimentalFeatures } from '../common/experimental_features';
import { parseExperimentalConfigValue } from '../common/experimental_features';
import type { ConfigSchema as StackConnectorsConfigType } from './config';
export interface ConnectorsPluginsSetup {
  actions: ActionsPluginSetupContract;
  cloud?: CloudSetup;
}

export interface ConnectorsPluginsStart {
  actions: ActionsPluginSetupContract;
  licensing: LicensingPluginStart;
}

export class StackConnectorsPlugin
  implements Plugin<void, void, ConnectorsPluginsSetup, ConnectorsPluginsStart>
{
  private readonly logger: Logger;
  private config: StackConnectorsConfigType;
  readonly experimentalFeatures: ExperimentalFeatures;

  // Whether this is a Serverless deployment, and — if so — whether its organization is in trial.
  // Serverless projects always report an `enterprise` ES license, so their trial status can only
  // come from Cloud config (which is static for the process lifetime).
  private isServerless = false;
  private isServerlessTrial = false;
  private licensing?: LicensingPluginStart;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.config = context.config.get();
    this.experimentalFeatures = parseExperimentalConfigValue(this.config.enableExperimental || []);
  }

  // Trial detection for the Elastic-managed email SMTP relay (the `elastic_cloud` service).
  private isElasticCloudTrial = async (): Promise<boolean> => {
    if (this.isServerless) {
      return this.isServerlessTrial;
    }
    // On ECH the ES license tier reflects the current subscription. `getLicense()` reads the
    // licensing plugin's cached license (no ES round-trip), so a trial -> paid conversion is
    // picked up without a Kibana restart.
    const license = await this.licensing?.getLicense();
    return license?.type === 'trial';
  };

  public setup(core: CoreSetup<ConnectorsPluginsStart>, plugins: ConnectorsPluginsSetup) {
    const router = core.http.createRouter();
    const { actions } = plugins;

    // Serverless trial status is only available on the Cloud setup contract and is static config,
    // so capture it here. The live ECH license is tracked from the licensing observable in start().
    this.isServerless = plugins.cloud?.isServerlessEnabled ?? false;
    this.isServerlessTrial = plugins.cloud?.serverless.organizationInTrial ?? false;

    const awsSesConfig = actions.getActionsConfigurationUtilities().getAwsSesConfig();
    getWellKnownEmailServiceRoute(router, awsSesConfig);
    validSlackApiChannelsRoute(router, actions.getActionsConfigurationUtilities(), this.logger);

    registerConnectorTypes({
      actions,
      publicBaseUrl: core.http.basePath.publicBaseUrl,
      experimentalFeatures: this.experimentalFeatures,
      isElasticCloudTrial: this.isElasticCloudTrial,
    });
  }

  public start(core: CoreStart, plugins: ConnectorsPluginsStart) {
    this.licensing = plugins.licensing;
  }

  public stop() {}
}
