/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';
import { Legacy } from 'kibana';

import { HomeServerPluginSetup } from 'src/plugins/home/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { PluginSetupContract } from '../../../../plugins/features/server';

export interface CoreSetup {
  elasticsearch: ElasticsearchPlugin;
  getInjectedUiAppVars: Legacy.Server['getInjectedUiAppVars'];
  getServerConfig: Legacy.Server['config'];
  http: {
    route: Legacy.Server['route'];
  };
}

export interface PluginsSetup {
  features: PluginSetupContract;
  home: HomeServerPluginSetup;
  interpreter: {
    register: (specs: any) => any;
  };
  kibana: {
    injectedUiAppVars: ReturnType<Legacy.Server['getInjectedUiAppVars']>;
  };
  usageCollection: UsageCollectionSetup;
}

export async function createSetupShim(
  server: Legacy.Server
): Promise<{ coreSetup: CoreSetup; pluginsSetup: PluginsSetup }> {
  const setup = server.newPlatform.setup.core;
  return {
    coreSetup: {
      ...setup,
      elasticsearch: server.plugins.elasticsearch,
      getInjectedUiAppVars: server.getInjectedUiAppVars,
      getServerConfig: () => server.config(),
      http: {
        // @ts-ignore: New Platform object not typed
        ...server.newPlatform.setup.core.http,
        route: (...args) => server.route(...args),
      },
    },
    pluginsSetup: {
      // @ts-ignore: New Platform not typed
      features: server.newPlatform.setup.plugins.features,
      home: server.newPlatform.setup.plugins.home,
      // @ts-ignore Interpreter plugin not typed on legacy server
      interpreter: server.plugins.interpreter,
      kibana: {
        injectedUiAppVars: await server.getInjectedUiAppVars('kibana'),
      },
      usageCollection: server.newPlatform.setup.plugins.usageCollection,
    },
  };
}
