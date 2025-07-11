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
import type { ConnectorServerSideDefinition } from '@kbn/search-connectors';
import { isAgentlessEnabled } from '@kbn/fleet-plugin/server/services/utils/agentless';
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
import { registerApiKeysRoutes } from './routes/api_keys';
import { SearchConnectorsConfig } from './config';
import { AgentlessConnectorDeploymentsSyncService } from './task';

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
  private readonly config: SearchConnectorsConfig;
  private agentlessConnectorDeploymentsSyncService: AgentlessConnectorDeploymentsSyncService;

  constructor(initializerContext: PluginInitializerContext) {
    this.connectors = [];
    this.logger = initializerContext.logger;
    this.config = initializerContext.config.get();
    this.agentlessConnectorDeploymentsSyncService = new AgentlessConnectorDeploymentsSyncService(
      this.logger.get()
    );
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

    const coreStartServices = coreSetup.getStartServices();

    // There seems to be no way to check for agentless here
    // So we register a task, but do not execute it in `start` method
    this.logger.get().debug('Registering agentless connectors infra sync task');

    coreStartServices
      .then(([coreStart, searchConnectorsPluginStartDependencies]) => {
        this.agentlessConnectorDeploymentsSyncService.registerInfraSyncTask(
          plugins,
          coreStart,
          searchConnectorsPluginStartDependencies
        );
      })
      .catch((err) => {
        this.logger.get().error(`Error registering agentless connectors infra sync task`, err);
      });
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
      registerStatsRoutes({ ...plugins, router, log: this.logger.get() });
      registerMappingRoute({ ...plugins, router, log: this.logger.get() });
      registerSearchRoute({ ...plugins, router, log: this.logger.get() });
      registerApiKeysRoutes({ ...plugins, router });
    }
    return {
      getConnectorTypes: () => this.connectors,
    };
  }

  public start(core: CoreStart, plugins: SearchConnectorsPluginStartDependencies) {
    if (isAgentlessEnabled()) {
      this.logger
        .get()
        .info(
          'Agentless is supported, scheduling initial agentless connectors infrastructure watcher task'
        );
      // this.agentlessConnectorDeploymentsSyncService
      //   .scheduleInfraSyncTask(this.config, plugins.taskManager)
      //   .catch((err) => {
      //     this.logger.get().error(`Error scheduling agentless connectors infra sync task`, err);
      //   });
    } else {
      this.logger
        .get()
        .info(
          'Agentless is not supported, skipping scheduling initial agentless connectors infrastructure watcher task'
        );
    }
    return {
      getConnectors: () => this.connectors,
    };
  }

  public stop() {}
}
