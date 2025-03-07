/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, Plugin, CoreSetup, CoreStart } from '@kbn/core/server';
import { ConnectorServerSideDefinition } from '@kbn/search-connectors';
import { getConnectorTypes } from '../common/lib/connector_types';
import type {
  SearchConnectorsPluginSetup,
  SearchConnectorsPluginStart,
  SearchConnectorsPluginSetupDependencies,
  SearchConnectorsPluginStartDependencies,
} from './types';
import { registerConnectorRoutes } from './routes/connectors';

export class SearchConnectorsPlugin
  implements
    Plugin<
      SearchConnectorsPluginSetup,
      SearchConnectorsPluginStart,
      SearchConnectorsPluginSetupDependencies,
      SearchConnectorsPluginStartDependencies
    >
{
  private connectors: ConnectorServerSideDefinition[];

  constructor(initializerContext: PluginInitializerContext) {
    this.connectors = [];
  }

  public setup(
    coreSetup: CoreSetup<SearchConnectorsPluginStartDependencies, SearchConnectorsPluginStart>,
    plugins: SearchConnectorsPluginSetupDependencies
  ) {
    const http = coreSetup.http;

    this.connectors = getConnectorTypes(http.staticAssets);
    // Enterprise Search Routes
    if (this.connectors.length > 0) {
      registerConnectorRoutes(plugins);
    }
    return {
      getConnectorTypes: () => this.connectors,
    };
  }

  public start(core: CoreStart, plugins: SearchConnectorsPluginStartDependencies) {
    return {
      getConnectors: () => this.connectors,
    };
  }

  public stop() {}
}
