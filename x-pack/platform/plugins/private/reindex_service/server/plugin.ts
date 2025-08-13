/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { handleEsError } from '@kbn/es-ui-shared-plugin/server';

import { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import {
  CoreSetup,
  Logger,
  SavedObjectsClient,
  SavedObjectsServiceStart,
  ElasticsearchServiceStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';

import { reindexOperationSavedObjectType, Version } from '@kbn/upgrade-assistant-pkg-server';
import { RouteDependencies, ReindexServiceServerPluginStart } from './types';

<<<<<<< HEAD
import { ReindexServiceWrapper } from './src/lib/reindex_service_wrapper';
=======
import { ReindexWorker } from './src/lib';
>>>>>>> main
import { CredentialStore, credentialStoreFactory } from './src/lib/credential_store';
import { registerBatchReindexIndicesRoutes, registerReindexIndicesRoutes } from './src/routes';

interface PluginsSetup {
  licensing: LicensingPluginSetup;
}

interface PluginsStart {
  security: SecurityPluginStart;
}

export class ReindexServiceServerPlugin
  implements Plugin<void, ReindexServiceServerPluginStart, PluginsSetup, PluginsStart>
{
<<<<<<< HEAD
  private reindexService: ReturnType<ReindexServiceWrapper['getInternalApis']> | null = null;
=======
  private reindexWorker: ReindexWorker | null = null;
>>>>>>> main

  // Properties set at setup
  private licensing?: LicensingPluginSetup;

  private readonly logger: Logger;
  private readonly credentialStore: CredentialStore;
<<<<<<< HEAD
=======
  private securityPluginStart?: SecurityPluginStart;
>>>>>>> main
  private version: Version;

  constructor({ logger, env }: PluginInitializerContext) {
    this.logger = logger.get();
    // used by worker and passed to routes
    this.credentialStore = credentialStoreFactory(this.logger);
    this.version = new Version();
    this.version.setup(env.packageInfo.version);
  }

<<<<<<< HEAD
  public setup(
    {
      http,
      savedObjects,
      getStartServices,
    }: CoreSetup<PluginsStart, ReindexServiceServerPluginStart>,
    { licensing }: PluginsSetup
  ) {
=======
  public setup({ http, savedObjects }: CoreSetup, { licensing }: PluginsSetup) {
>>>>>>> main
    this.licensing = licensing;
    const router = http.createRouter();

    const dependencies: RouteDependencies = {
      router,
      credentialStore: this.credentialStore,
      log: this.logger,
      licensing,
<<<<<<< HEAD
      getSecurityPlugin: async () => {
        const [, { security }] = await getStartServices();
        return security;
      },
=======
      getSecurityPlugin: () => this.securityPluginStart,
>>>>>>> main
      lib: {
        handleEsError,
      },
      version: this.version,
<<<<<<< HEAD
      getReindexService: async () => {
        const [, , reindexService] = await getStartServices();
        return reindexService;
      },
=======
>>>>>>> main
    };

    savedObjects.registerType(reindexOperationSavedObjectType);

<<<<<<< HEAD
    registerReindexIndicesRoutes(dependencies);
    // might be possible to avoid padding the worker here
    registerBatchReindexIndicesRoutes(dependencies, () => this.getReindexService().getWorker());
=======
    registerReindexIndicesRoutes(dependencies, () => this.getWorker());
    registerBatchReindexIndicesRoutes(dependencies, () => this.getWorker());
>>>>>>> main
  }

  public start(
    {
      savedObjects,
      elasticsearch,
    }: { savedObjects: SavedObjectsServiceStart; elasticsearch: ElasticsearchServiceStart },
    { security }: PluginsStart
<<<<<<< HEAD
  ): ReindexServiceServerPluginStart {
=======
  ) {
    this.securityPluginStart = security;

>>>>>>> main
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

<<<<<<< HEAD
    const service = new ReindexServiceWrapper(
=======
    this.reindexWorker = ReindexWorker.create(
>>>>>>> main
      soClient,
      this.credentialStore,
      elasticsearch.client,
      this.logger,
      this.licensing!,
      security,
      this.version
    );

<<<<<<< HEAD
    this.reindexService = service.getInternalApis();

    return {
      getScopedClient: service.getScopedClient,
      // todo move internally
      cleanupReindexOperations: service.cleanupReindexOperations.bind(service),
=======
    this.reindexWorker?.start();

    return {
      cleanupReindexOperations: this.reindexWorker?.cleanupReindexOperations.bind(
        this.reindexWorker
      ),
>>>>>>> main
    };
  }

  public stop() {
<<<<<<< HEAD
    this.reindexService?.stop();
  }

  private getReindexService() {
    if (!this.reindexService) {
      throw new Error('Worker unavailable');
    }
    return this.reindexService;
=======
    if (this.reindexWorker) {
      this.reindexWorker.stop();
    }
  }

  private getWorker() {
    if (!this.reindexWorker) {
      throw new Error('Worker unavailable');
    }
    return this.reindexWorker;
>>>>>>> main
  }
}
