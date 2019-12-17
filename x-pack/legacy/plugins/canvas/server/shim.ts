/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';
import { Legacy } from 'kibana';

import { CoreSetup as ExistingCoreSetup } from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { PluginSetupContract } from '../../../../plugins/features/server';

export interface CoreSetup {
  elasticsearch: ElasticsearchPlugin;
  getInjectedUiAppVars: Legacy.Server['getInjectedUiAppVars'];
  getServerConfig: Legacy.Server['config'];
  http: {
    route: Legacy.Server['route'];
  };
  injectUiAppVars: Legacy.Server['injectUiAppVars'];
}

export interface PluginsSetup {
  features: PluginSetupContract;
  interpreter: {
    register: (specs: any) => any;
  };
  kibana: {
    injectedUiAppVars: ReturnType<Legacy.Server['getInjectedUiAppVars']>;
  };
  sampleData: {
    addSavedObjectsToSampleDataset: any;
    addAppLinksToSampleDataset: any;
  };
  usageCollection: UsageCollectionSetup;
}

export async function createSetupShim(
  server: Legacy.Server
): Promise<{ coreSetup: CoreSetup; pluginsSetup: PluginsSetup }> {
  // @ts-ignore: New Platform object not typed
  const setup: ExistingCoreSetup = server.newPlatform.setup.core;

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
      injectUiAppVars: server.injectUiAppVars,
    },
    pluginsSetup: {
      // @ts-ignore: New Platform not typed
      features: server.newPlatform.setup.plugins.features,
      // @ts-ignore Interpreter plugin not typed on legacy server
      interpreter: server.plugins.interpreter,
      kibana: {
        injectedUiAppVars: await server.getInjectedUiAppVars('kibana'),
      },
      sampleData: {
        // @ts-ignore: Missing from Legacy Server Type
        addSavedObjectsToSampleDataset: server.addSavedObjectsToSampleDataset,
        // @ts-ignore: Missing from Legacy Server Type
        addAppLinksToSampleDataset: server.addAppLinksToSampleDataset,
      },
      usageCollection: server.newPlatform.setup.plugins.usageCollection,
    },
  };
}
