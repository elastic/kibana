/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, Plugin, CoreSetup, CoreStart } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';

import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import { registerInferenceConnectorsUsageCollector } from './usage/inference/inference_connectors_usage_collector';
import { registerConnectorTypes } from './connector_types';
import {
  getWellKnownEmailServiceRoute,
  getWebhookSecretHeadersKeyRoute,
  getHttpSecretQueryParamsKeyRoute,
} from './routes';
import type { ExperimentalFeatures } from '../common/experimental_features';
import { parseExperimentalConfigValue } from '../common/experimental_features';
import type { ConfigSchema as StackConnectorsConfigType } from './config';
import { registerConnectorTypesFromSpecs } from './connector_types_from_spec';

export interface ConnectorsPluginsSetup {
  actions: ActionsPluginSetupContract;
  usageCollection?: UsageCollectionSetup;
  cloud?: CloudSetup;
}

export interface ConnectorsPluginsStart {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  actions: ActionsPluginStartContract;
  spaces: SpacesPluginSetup;
  licensing: LicensingPluginStart;
}

export class StackConnectorsPlugin
  implements Plugin<void, void, ConnectorsPluginsSetup, ConnectorsPluginsStart>
{
  private config: StackConnectorsConfigType;
  readonly experimentalFeatures: ExperimentalFeatures;

  // Whether this is a Serverless deployment, and — if so — whether its organization is in trial.
  // Serverless projects always report an `enterprise` ES license, so their trial status can only
  // come from Cloud config (which is static for the process lifetime).
  private isServerless = false;
  private isServerlessTrial = false;
  private licensing?: LicensingPluginStart;

  constructor(context: PluginInitializerContext) {
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
    getWebhookSecretHeadersKeyRoute(router, core.getStartServices);
    getHttpSecretQueryParamsKeyRoute(router, core.getStartServices);

    registerConnectorTypes({
      actions,
      publicBaseUrl: core.http.basePath.publicBaseUrl,
      experimentalFeatures: this.experimentalFeatures,
      isElasticCloudTrial: this.isElasticCloudTrial,
    });

    if (this.experimentalFeatures.connectorsFromSpecs) {
      registerConnectorTypesFromSpecs({ actions });
    }

    if (plugins.usageCollection) {
      registerInferenceConnectorsUsageCollector(plugins.usageCollection, core);
    }
  }

  public start(core: CoreStart, plugins: ConnectorsPluginsStart) {
    this.licensing = plugins.licensing;
  }

  public stop() {}
}
