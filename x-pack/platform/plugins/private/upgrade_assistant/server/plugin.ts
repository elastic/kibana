/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import {
  Plugin,
  CoreSetup,
  CoreStart,
  PluginInitializerContext,
  Logger,
  SavedObjectsClient,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { LogsSharedPluginSetup } from '@kbn/logs-shared-plugin/server';

import { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import { DEPRECATION_LOGS_SOURCE_ID, DEPRECATION_LOGS_INDEX } from '../common/constants';

import { CredentialStore, credentialStoreFactory } from './lib/reindexing/credential_store';
import { ReindexWorker } from './lib/reindexing';
import { registerUpgradeAssistantUsageCollector } from './lib/telemetry';
import { versionService } from './lib/version';
import { createReindexWorker } from './routes/reindex_indices';
import { registerRoutes } from './routes/register_routes';
import {
  reindexOperationSavedObjectType,
  mlSavedObjectType,
  hiddenTypes,
} from './saved_object_types';
import { handleEsError } from './shared_imports';
import { RouteDependencies } from './types';
import type { UpgradeAssistantConfig } from './config';
import type { FeatureSet } from '../common/types';

interface PluginsSetup {
  usageCollection: UsageCollectionSetup;
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetup;
  logsShared: LogsSharedPluginSetup;
  security?: SecurityPluginSetup;
}

interface PluginsStart {
  security: SecurityPluginStart;
}

export class UpgradeAssistantServerPlugin implements Plugin {
  private readonly logger: Logger;
  private readonly credentialStore: CredentialStore;
  private readonly kibanaVersion: string;
  private readonly initialFeatureSet: FeatureSet;

  // Properties set at setup
  private licensing?: LicensingPluginSetup;

  // Properties set at start
  private savedObjectsServiceStart?: SavedObjectsServiceStart;
  private securityPluginStart?: SecurityPluginStart;
  private worker?: ReindexWorker;

  constructor({ logger, env, config }: PluginInitializerContext<UpgradeAssistantConfig>) {
    this.logger = logger.get();
    this.credentialStore = credentialStoreFactory(this.logger);
    this.kibanaVersion = env.packageInfo.version;

    const { featureSet } = config.get();
    this.initialFeatureSet = featureSet;
  }

  private getWorker() {
    if (!this.worker) {
      throw new Error('Worker unavailable');
    }
    return this.worker;
  }

  setup(
    { http, getStartServices, savedObjects }: CoreSetup,
    { usageCollection, features, licensing, logsShared, security }: PluginsSetup
  ) {
    this.licensing = licensing;

    savedObjects.registerType(reindexOperationSavedObjectType);
    savedObjects.registerType(mlSavedObjectType);

    features.registerElasticsearchFeature({
      id: 'upgrade_assistant',
      management: {
        stack: ['upgrade_assistant'],
      },
      privileges: [
        {
          requiredClusterPrivileges: ['manage'],
          ui: [],
        },
      ],
    });

    // We need to initialize the deprecation logs plugin so that we can
    // navigate from this app to the observability app using a source_id.
    logsShared?.logViews.defineInternalLogView(DEPRECATION_LOGS_SOURCE_ID, {
      name: 'deprecationLogs',
      description: 'deprecation logs',
      logIndices: {
        type: 'index_name',
        indexName: DEPRECATION_LOGS_INDEX,
      },
      logColumns: [
        { timestampColumn: { id: 'timestampField' } },
        { messageColumn: { id: 'messageField' } },
      ],
    });

    const router = http.createRouter();
    // Initialize version service with current kibana version
    versionService.setup(this.kibanaVersion);

    const dependencies: RouteDependencies = {
      router,
      credentialStore: this.credentialStore,
      log: this.logger,
      licensing,
      getSavedObjectsService: () => {
        if (!this.savedObjectsServiceStart) {
          throw new Error('Saved Objects Start service not available');
        }
        return this.savedObjectsServiceStart;
      },
      getSecurityPlugin: () => this.securityPluginStart,
      lib: {
        handleEsError,
      },
      config: {
        featureSet: this.initialFeatureSet,
        isSecurityEnabled: () => security !== undefined && security.license.isEnabled(),
      },
      current: versionService.getCurrentVersion(),
      defaultTarget: versionService.getNextMajorVersion(),
    };

    registerRoutes(dependencies, this.getWorker.bind(this));

    if (usageCollection) {
      void getStartServices().then(([{ elasticsearch }]) => {
        registerUpgradeAssistantUsageCollector({
          elasticsearch,
          usageCollection,
        });
      });
    }
  }

  start({ savedObjects, elasticsearch }: CoreStart, { security }: PluginsStart) {
    this.savedObjectsServiceStart = savedObjects;
    this.securityPluginStart = security;

    // The ReindexWorker uses a map of request headers that contain the authentication credentials
    // for a given reindex. We cannot currently store these in an the .kibana index b/c we do not
    // want to expose these credentials to any unauthenticated users. We also want to avoid any need
    // to add a user for a special index just for upgrading. This in-memory cache allows us to
    // process jobs without the browser staying on the page, but will require that jobs go into
    // a paused state if no Kibana nodes have the required credentials.

    this.worker = createReindexWorker({
      credentialStore: this.credentialStore,
      licensing: this.licensing!,
      elasticsearchService: elasticsearch,
      logger: this.logger,
      savedObjects: new SavedObjectsClient(
        this.savedObjectsServiceStart.createInternalRepository(hiddenTypes)
      ),
      security: this.securityPluginStart,
    });

    this.worker.start();
  }

  stop(): void {
    if (this.worker) {
      this.worker.stop();
    }
  }
}
