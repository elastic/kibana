/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  Logger,
  SavedObjectsClient,
  LoggerFactory,
  SavedObjectsServiceStart,
  ElasticsearchServiceStart,
} from '@kbn/core/server';
import { SecurityPluginStart, SecurityPluginSetup } from '@kbn/security-plugin/server';
import { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import { ReindexWorker } from '../lib/reindexing';
import { createReindexWorker } from './create_reindex_worker';
import { CredentialStore, credentialStoreFactory } from '../lib/reindexing/credential_store';
import { hiddenTypes } from '../saved_object_types';
import { registerBatchReindexIndicesRoutes, registerReindexIndicesRoutes } from './routes';
import { handleEsError } from '../shared_imports';
import { ReindexingServiceConfig } from './config'
import { defaultExclusions } from '../lib/data_source_exclusions';
import type { DataSourceExclusions, FeatureSet } from '../../common/types';

import { RouteDependencies } from './types';

interface PluginsStart {
  security: SecurityPluginStart;
}

interface PluginsSetup {
  licensing: LicensingPluginSetup;
  security?: SecurityPluginSetup;
}

type ReindexingServiceType = { logger: LoggerFactory, config: { get: () => ReindexingServiceConfig }  };

export class ReindexingService {
  private reindexWorker: ReindexWorker | null = null;

  // Properties set at setup
  private licensing?: LicensingPluginSetup;

  private readonly logger: Logger;
  private readonly credentialStore: CredentialStore;
  private securityPluginStart?: SecurityPluginStart;
  private readonly initialFeatureSet: FeatureSet;
  private readonly initialDataSourceExclusions: DataSourceExclusions;

  constructor({ logger, config }: ReindexingServiceType) {
    this.logger = logger.get();
    // used by worker and passed to routes
    this.credentialStore = credentialStoreFactory(this.logger);

    const { featureSet, dataSourceExclusions } = config.get();
    this.initialFeatureSet = featureSet;
    this.initialDataSourceExclusions = Object.assign({}, defaultExclusions, dataSourceExclusions);
  }

  public setup({ http }: CoreSetup, { licensing, security }: PluginsSetup) {
    this.licensing = licensing;
    // todo routing
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
      config: {
        featureSet: this.initialFeatureSet,
        dataSourceExclusions: this.initialDataSourceExclusions,
        isSecurityEnabled: () => security !== undefined && security.license.isEnabled(),
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

    this.reindexWorker.start();
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
