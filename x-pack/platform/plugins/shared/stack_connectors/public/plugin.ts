/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';
import type { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
import type { ConfigSchema as StackConnectorsConfigType } from '../server/config';
import { registerConnectorTypes } from './connector_types';
import { ExperimentalFeaturesService } from './common/experimental_features_service';
import type { ExperimentalFeatures } from '../common/experimental_features';
import { parseExperimentalConfigValue } from '../common/experimental_features';
import { ConfigService } from './common/config_service';
import { registerConnectorTypesFromSpecs } from './connector_types_from_spec';

export type Setup = void;
export type Start = void;

export interface StackConnectorsPublicSetupDeps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  actions: ActionsPublicPluginSetup;
}

export class StackConnectorsPublicPlugin
  implements Plugin<Setup, Start, StackConnectorsPublicSetupDeps>
{
  private config: StackConnectorsConfigType;
  readonly experimentalFeatures: ExperimentalFeatures;

  constructor(ctx: PluginInitializerContext) {
    this.config = ctx.config.get();
    this.experimentalFeatures = parseExperimentalConfigValue(this.config.enableExperimental || []);
  }
  public setup(core: CoreSetup, { triggersActionsUi, actions }: StackConnectorsPublicSetupDeps) {
    ExperimentalFeaturesService.init({ experimentalFeatures: this.experimentalFeatures });
    ConfigService.init({ config: this.config });

    registerConnectorTypes({
      connectorTypeRegistry: triggersActionsUi.actionTypeRegistry,
      services: {
        validateEmailAddresses: actions.validateEmailAddresses,
      },
    });

    if (ExperimentalFeaturesService.get().connectorsFromSpecs) {
      registerConnectorTypesFromSpecs({
        connectorTypeRegistry: triggersActionsUi.actionTypeRegistry,
        uiSettingsPromise: core.getStartServices().then(([coreStart]) => coreStart.uiSettings),
      });
    }
  }

  public start() {}
  public stop() {}
}
