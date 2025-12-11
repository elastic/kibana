/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import { registerDataSources } from './data_sources';
import type {
  DataConnectorsServerSetup,
  DataConnectorsServerSetupDependencies,
  DataConnectorsServerStart,
  DataConnectorsServerStartDependencies,
} from './types';
import { registerUISettings } from './register';

export class DataConnectorsServerPlugin
  implements
    Plugin<
      DataConnectorsServerSetup,
      DataConnectorsServerStart,
      DataConnectorsServerSetupDependencies,
      DataConnectorsServerStartDependencies
    >
{
  constructor(context: PluginInitializerContext) {}

  setup(
    core: CoreSetup,
    plugins: DataConnectorsServerSetupDependencies
  ): DataConnectorsServerSetup {
    const { uiSettings } = core;
    const { dataSourcesRegistry } = plugins;

    // Register WorkplaceAI-owned data sources
    registerDataSources(dataSourcesRegistry);

    registerUISettings({ uiSettings });

    return {};
  }

  start(core: CoreStart): DataConnectorsServerStart {
    return {};
  }
}
