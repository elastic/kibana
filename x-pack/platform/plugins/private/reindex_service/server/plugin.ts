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

import { ReindexWorker } from './src/lib';
import { createReindexWorker } from './src/create_reindex_worker';
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
  private reindexWorker: ReindexWorker | null = null;

  // Properties set at setup
  private licensing?: LicensingPluginSetup;

  private readonly logger: Logger;
  private readonly credentialStore: CredentialStore;
  private securityPluginStart?: SecurityPluginStart;
  private version: Version;

  constructor({ logger, env }: PluginInitializerContext) {
    this.logger = logger.get();
    // used by worker and passed to routes
    this.credentialStore = credentialStoreFactory(this.logger);
    this.version = new Version();
    this.version.setup(env.packageInfo.version);
  }

  public setup({ http, savedObjects }: CoreSetup, { licensing }: PluginsSetup) {
    this.licensing = licensing;
    const router = http.createRouter();

    const dependencies: RouteDependencies = {
      router,
      credentialStore: this.credentialStore,
      log: this.logger,
      licensing,
      getSecurityPlugin: () => this.securityPluginStart,
      lib: {
        handleEsError,
      },
      version: this.version,
    };

    savedObjects.registerType(reindexOperationSavedObjectType);

    registerReindexIndicesRoutes(dependencies, () => this.getWorker());
    registerBatchReindexIndicesRoutes(dependencies, () => this.getWorker());
  }

  public start(
    {
      savedObjects,
      elasticsearch,
    }: { savedObjects: SavedObjectsServiceStart; elasticsearch: ElasticsearchServiceStart },
    { security }: PluginsStart
  ) {
    this.securityPluginStart = security;

    // The ReindexWorker uses a map of request headers that contain the authentication credentials
    // for a given reindex. We cannot currently store these in an the .kibana index b/c we do not
    // want to expose these credentials to any unauthenticated users. We also want to avoid any need
    // to add a user for a special index just for upgrading. This in-memory cache allows us to
    // process jobs without the browser staying on the page, but will require that jobs go into
    // a paused state if no Kibana nodes have the required credentials.

    // The ReindexWorker will use the credentials stored in the cache to reindex the data

    this.reindexWorker = createReindexWorker({
      credentialStore: this.credentialStore,
      licensing: this.licensing!,
      elasticsearchService: elasticsearch,
      logger: this.logger,
      savedObjects: new SavedObjectsClient(
        savedObjects.createInternalRepository([reindexOperationSavedObjectType.name])
      ),
      security: this.securityPluginStart,
    });

    this.reindexWorker?.start();

    return {
      cleanupReindexOperations: this.reindexWorker?.cleanupReindexOperations.bind(
        this.reindexWorker
      ),
    };
  }

  public stop() {
    if (this.reindexWorker) {
      this.reindexWorker.stop();
    }
  }

  private getWorker() {
    if (!this.reindexWorker) {
      throw new Error('Worker unavailable');
    }
    return this.reindexWorker;
  }
}
