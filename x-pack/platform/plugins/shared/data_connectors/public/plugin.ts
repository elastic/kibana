/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import { DATA_CONNECTORS_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { registerApp } from './register';
import type {
  DataConnectorsPluginSetup,
  DataConnectorsPluginSetupDependencies,
  DataConnectorsPluginStart,
  DataConnectorsPluginStartDependencies,
} from './types';

export class DataConnectorsPlugin
  implements
    Plugin<
      DataConnectorsPluginSetup,
      DataConnectorsPluginStart,
      DataConnectorsPluginSetupDependencies,
      DataConnectorsPluginStartDependencies
    >
{
  constructor(context: PluginInitializerContext) {}
  setup(
    core: CoreSetup<DataConnectorsPluginStartDependencies, DataConnectorsPluginStart>
  ): DataConnectorsPluginSetup {
    const isDataConnectorsEnabled = core.settings.client.get<boolean>(
      DATA_CONNECTORS_ENABLED_SETTING_ID
    );
    if (isDataConnectorsEnabled) {
      registerApp({ core });
    }
    return {};
  }
  start(core: CoreStart): DataConnectorsPluginStart {
    return {};
  }
}
