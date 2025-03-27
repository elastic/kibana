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
  LoggerFactory,
} from '@kbn/core/server';
import { ConnectorServerSideDefinition } from '@kbn/search-connectors';
import { getConnectorTypes } from '../common/lib/connector_types';
import type {
  SearchConnectorsPluginSetup,
  SearchConnectorsPluginStart,
  SearchConnectorsPluginSetupDependencies,
  SearchConnectorsPluginStartDependencies,
} from './types';
import { registerConnectorRoutes } from './routes/connectors';
import { registerStatsRoutes } from './routes/stats';
import { registerMappingRoute } from './routes/mapping';
import { registerSearchRoute } from './routes/search';
import { PLUGIN_ID } from '../common/constants';

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
  private readonly logger: LoggerFactory;

  constructor(initializerContext: PluginInitializerContext) {
    this.connectors = [];
    this.logger = initializerContext.logger;
  }

  public setup(
    coreSetup: CoreSetup<SearchConnectorsPluginStartDependencies, SearchConnectorsPluginStart>,
    plugins: SearchConnectorsPluginSetupDependencies
  ) {
    const http = coreSetup.http;

    plugins.features.registerElasticsearchFeature({
      id: PLUGIN_ID,
      management: {
        data: [PLUGIN_ID],
      },
      privileges: [
        {
          requiredClusterPrivileges: ['monitor'],
          ui: [],
        },
      ],
    });

    this.connectors = getConnectorTypes(http.staticAssets);
    const router = http.createRouter();

    // Enterprise Search Routes
    if (this.connectors.length > 0) {
      /**
       * Register routes
       */
      registerConnectorRoutes({
        ...plugins,
        router,
        getStartServices: coreSetup.getStartServices,
        log: this.logger.get(),
      });
    }
    registerStatsRoutes({ ...plugins, router, log: this.logger.get() });
    registerMappingRoute({ ...plugins, router, log: this.logger.get() });
    registerSearchRoute({ ...plugins, router, log: this.logger.get() });
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
