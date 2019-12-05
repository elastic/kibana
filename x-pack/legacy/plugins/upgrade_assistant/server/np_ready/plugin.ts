/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Plugin, CoreSetup, CoreStart } from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { ServerShim, ServerShimWithRouter } from './types';
import { credentialStoreFactory } from './lib/reindexing/credential_store';
import { registerUpgradeAssistantUsageCollector } from './lib/telemetry';
import { registerClusterCheckupRoutes } from './routes/cluster_checkup';
import { registerDeprecationLoggingRoutes } from './routes/deprecation_logging';
import { registerReindexIndicesRoutes, registerReindexWorker } from './routes/reindex_indices';
import { CloudSetup } from '../../../../../plugins/cloud/server';
import { registerTelemetryRoutes } from './routes/telemetry';
import { registerQueryDefaultFieldRoutes } from './routes/query_default_field';

interface PluginsSetup {
  __LEGACY: ServerShim;
  usageCollection: UsageCollectionSetup;
  cloud?: CloudSetup;
}

export class UpgradeAssistantServerPlugin implements Plugin<void, void, object, object> {
  setup({ http }: CoreSetup, { __LEGACY, usageCollection, cloud }: PluginsSetup) {
    const router = http.createRouter();
    const shimWithRouter: ServerShimWithRouter = { ...__LEGACY, router };
    registerClusterCheckupRoutes(shimWithRouter, { cloud });
    registerDeprecationLoggingRoutes(shimWithRouter);
    registerQueryDefaultFieldRoutes(shimWithRouter);

    // The ReindexWorker uses a map of request headers that contain the authentication credentials
    // for a given reindex. We cannot currently store these in an the .kibana index b/c we do not
    // want to expose these credentials to any unauthenticated users. We also want to avoid any need
    // to add a user for a special index just for upgrading. This in-memory cache allows us to
    // process jobs without the browser staying on the page, but will require that jobs go into
    // a paused state if no Kibana nodes have the required credentials.
    const credentialStore = credentialStoreFactory();

    const worker = registerReindexWorker(__LEGACY, credentialStore);
    registerReindexIndicesRoutes(shimWithRouter, worker, credentialStore);

    // Bootstrap the needed routes and the collector for the telemetry
    registerTelemetryRoutes(shimWithRouter);
    registerUpgradeAssistantUsageCollector(usageCollection, __LEGACY);
  }

  start(core: CoreStart, plugins: any) {}

  stop(): void {}
}
