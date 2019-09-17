/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';
import { Legacy } from 'kibana';

import { CoreSetup as ExistingCoreSetup } from 'src/core/server';

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
  interpreter: {
    register: (specs: any) => any;
  };
  sampleData: {
    addSavedObjectsToSampleDataset: any;
    addAppLinksToSampleDataset: any;
  };
  usage: Legacy.Server['usage'];
  xpackMain: Legacy.Server['plugins']['xpack_main'];
}

export function createSetupShim(
  server: Legacy.Server
): { coreSetup: CoreSetup; pluginsSetup: PluginsSetup } {
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
      // @ts-ignore Interpreter plugin not typed on legacy server
      interpreter: server.plugins.interpreter,
      sampleData: {
        // @ts-ignore: Missing from Legacy Server Type
        addSavedObjectsToSampleDataset: server.addSavedObjectsToSampleDataset,
        // @ts-ignore: Missing from Legacy Server Type
        addAppLinksToSampleDataset: server.addAppLinksToSampleDataset,
      },
      usage: server.usage,
      xpackMain: server.plugins.xpack_main,
    },
  };
}
