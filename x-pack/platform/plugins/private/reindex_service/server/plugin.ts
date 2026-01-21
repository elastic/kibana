/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityPluginStart } from '@kbn/security-plugin/server';

import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type {
  CoreSetup,
  Logger,
  SavedObjectsServiceStart,
  ElasticsearchServiceStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';

import { reindexOperationSavedObjectType } from '@kbn/upgrade-assistant-pkg-server';
import { Version } from '@kbn/upgrade-assistant-pkg-common';
import type { RouteDependencies, ReindexServiceServerPluginStart } from './types';

import type { ReindexServiceInternalApi } from './src/lib/reindex_service_wrapper';
import { ReindexServiceWrapper } from './src/lib/reindex_service_wrapper';
import { credentialStoreFactory } from './src/lib/credential_store';
import { registerBatchReindexIndicesRoutes, registerReindexIndicesRoutes } from './src/routes';
import type { ReindexConfig } from './config';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface PluginsSetup {}

interface PluginsStart {
  security: SecurityPluginStart;
  licensing: LicensingPluginStart;
}

export class ReindexServiceServerPlugin
  implements Plugin<void, ReindexServiceServerPluginStart, PluginsSetup, PluginsStart>
{
  private reindexService: ReindexServiceInternalApi | null = null;
  private readonly logger: Logger;
  private version: Version;
  private rollupsEnabled: boolean;
  private isServerless: boolean;

  constructor({ logger, env, config }: PluginInitializerContext) {
    this.logger = logger.get();
    this.version = new Version();
    this.version.setup(env.packageInfo.version);
    this.rollupsEnabled = config.get<ReindexConfig>().rollupsEnabled;
    this.isServerless = env.packageInfo.buildFlavor === 'serverless';
  }

  public setup({
    http,
    savedObjects,
    getStartServices,
  }: CoreSetup<PluginsStart, ReindexServiceServerPluginStart>) {
    const dependencies: RouteDependencies = {
      router: http.createRouter(),
      getReindexService: async () => {
        const [, , reindexService] = await getStartServices();
        return reindexService;
      },
    };

    savedObjects.registerType(reindexOperationSavedObjectType);

    registerReindexIndicesRoutes(dependencies);
    registerBatchReindexIndicesRoutes(dependencies);
  }

  public start(
    {
      savedObjects,
      elasticsearch,
    }: { savedObjects: SavedObjectsServiceStart; elasticsearch: ElasticsearchServiceStart },
    { security, licensing }: PluginsStart
  ): ReindexServiceServerPluginStart {
    const soClient = new SavedObjectsClient(
      savedObjects.createInternalRepository([reindexOperationSavedObjectType.name])
    );

    // The ReindexWorker uses a map of request headers that contain the authentication credentials
    // for a given reindex. We cannot currently store these in an the .kibana index b/c we do not
    // want to expose these credentials to any unauthenticated users. We also want to avoid any need
    // to add a user for a special index just for upgrading. This in-memory cache allows us to
    // process jobs without the browser staying on the page, but will require that jobs go into
    // a paused state if no Kibana nodes have the required credentials.

    // The ReindexWorker will use the credentials stored in the cache to reindex the data

    const service = new ReindexServiceWrapper({
      soClient,
      credentialStore: credentialStoreFactory(this.logger),
      clusterClient: elasticsearch.client,
      logger: this.logger,
      licensing,
      security,
      version: this.version,
      rollupsEnabled: this.rollupsEnabled,
      isServerless: this.isServerless,
    });

    this.reindexService = service.getInternalApis();

    return {
      cleanupReindexOperations: service.cleanupReindexOperations.bind(service),
      getScopedClient: service.getScopedClient.bind(service),
    };
  }

  public stop() {
    this.reindexService?.stop();
  }
}
