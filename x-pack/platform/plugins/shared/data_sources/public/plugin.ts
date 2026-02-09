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
import { DATA_SOURCES_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { registerApp } from './application/register';
import {
  registerDataSourceUIConfigs,
  registerDataSourceConnectorTypes,
} from './application/lib/data_source_ui_configs';
import type {
  DataSourcesPluginSetup,
  DataSourcesPluginSetupDependencies,
  DataSourcesPluginStart,
  DataSourcesPluginStartDependencies,
} from './types';

export class DataSourcesPlugin
  implements
    Plugin<
      DataSourcesPluginSetup,
      DataSourcesPluginStart,
      DataSourcesPluginSetupDependencies,
      DataSourcesPluginStartDependencies
    >
{
  constructor(context: PluginInitializerContext) {}
  setup(
    core: CoreSetup<DataSourcesPluginStartDependencies, DataSourcesPluginStart>,
    plugins: DataSourcesPluginSetupDependencies
  ): DataSourcesPluginSetup {
    const isDataSourcesEnabled = core.settings.client.get<boolean>(DATA_SOURCES_ENABLED_SETTING_ID);
    if (isDataSourcesEnabled) {
      registerApp({ core });
    }

    // Register UI configs first
    registerDataSourceUIConfigs();

    // Then register custom connector types with action type registry
    registerDataSourceConnectorTypes({
      actionTypeRegistry: plugins.triggersActionsUi.actionTypeRegistry,
    });

    return {};
  }
  start(core: CoreStart, plugins: DataSourcesPluginStartDependencies): DataSourcesPluginStart {
    return {};
  }
}
