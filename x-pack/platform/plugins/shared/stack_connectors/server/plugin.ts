/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, Plugin, CoreSetup } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';

import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';

import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import { registerInferenceConnectorsUsageCollector } from './usage/inference/inference_connectors_usage_collector';
import { registerConnectorTypes } from './connector_types';
import { getWellKnownEmailServiceRoute, getWebhookSecretHeadersKeyRoute } from './routes';
import type { ExperimentalFeatures } from '../common/experimental_features';
import { parseExperimentalConfigValue } from '../common/experimental_features';
import type { ConfigSchema as StackConnectorsConfigType } from './config';
import { registerConnectorTypesFromSpecs } from './connector_types_from_spec';

export interface ConnectorsPluginsSetup {
  actions: ActionsPluginSetupContract;
  usageCollection?: UsageCollectionSetup;
}

export interface ConnectorsPluginsStart {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  actions: ActionsPluginStartContract;
  spaces: SpacesPluginSetup;
}

export class StackConnectorsPlugin
  implements Plugin<void, void, ConnectorsPluginsSetup, ConnectorsPluginsStart>
{
  private config: StackConnectorsConfigType;
  readonly experimentalFeatures: ExperimentalFeatures;

  constructor(context: PluginInitializerContext) {
    this.config = context.config.get();
    this.experimentalFeatures = parseExperimentalConfigValue(this.config.enableExperimental || []);
  }

  public setup(core: CoreSetup<ConnectorsPluginsStart>, plugins: ConnectorsPluginsSetup) {
    const router = core.http.createRouter();
    const { actions } = plugins;

    const awsSesConfig = actions.getActionsConfigurationUtilities().getAwsSesConfig();

    getWellKnownEmailServiceRoute(router, awsSesConfig);
    getWebhookSecretHeadersKeyRoute(router, core.getStartServices);

    registerConnectorTypes({
      actions,
      publicBaseUrl: core.http.basePath.publicBaseUrl,
      experimentalFeatures: this.experimentalFeatures,
    });

    if (this.experimentalFeatures.connectorsFromSpecs) {
      registerConnectorTypesFromSpecs({ actions });
    }

    if (plugins.usageCollection) {
      registerInferenceConnectorsUsageCollector(plugins.usageCollection, core);
    }
  }

  public start() {}
  public stop() {}
}
