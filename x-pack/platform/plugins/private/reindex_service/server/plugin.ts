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
// import { SecurityPluginStart, SecurityPluginSetup } from '@kbn/security-plugin/server';
// import { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
// import { DEPRECATION_LOGS_SOURCE_ID, DEPRECATION_LOGS_INDEX } from '../common/constants';

// import { CredentialStore, credentialStoreFactory } from './lib/reindexing/credential_store';
// import { registerUpgradeAssistantUsageCollector } from './lib/telemetry';

import { hiddenTypes } from '@kbn/upgrade-assistant-server';
import { versionService } from './src/lib/version';
// import { reindexOperationSavedObjectType, mlSavedObjectType } from './saved_object_types';
import { RouteDependencies } from './src/types';

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

export class ReindexServiceServerPlugin implements Plugin {
  private reindexWorker: ReindexWorker | null = null;

  // Properties set at setup
  private licensing?: LicensingPluginSetup;

  private readonly logger: Logger;
  private readonly credentialStore: CredentialStore;
  private securityPluginStart?: SecurityPluginStart;

  constructor({ logger, env }: PluginInitializerContext) {
    this.logger = logger.get();
    // used by worker and passed to routes
    this.credentialStore = credentialStoreFactory(this.logger);
    versionService.setup(env.packageInfo.version);
  }

  public setup({ http }: CoreSetup, { licensing }: PluginsSetup) {
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
    };

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

    this.reindexWorker = createReindexWorker({
      credentialStore: this.credentialStore,
      licensing: this.licensing!,
      elasticsearchService: elasticsearch,
      logger: this.logger,
      savedObjects: new SavedObjectsClient(savedObjects.createInternalRepository(hiddenTypes)),
      security: this.securityPluginStart,
    });

    // todo its annoying it wants to see the conditional. look at removing later
    this.reindexWorker?.start();
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
