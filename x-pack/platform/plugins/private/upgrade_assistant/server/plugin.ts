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
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { LogsSharedPluginSetup } from '@kbn/logs-shared-plugin/server';

import { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { DataSourceExclusions, FeatureSet } from '@kbn/upgrade-assistant-pkg-server';
import {
  reindexOperationSavedObjectType,
  mlSavedObjectType,
} from '@kbn/upgrade-assistant-pkg-server';
import { DEPRECATION_LOGS_SOURCE_ID, DEPRECATION_LOGS_INDEX } from '../common/constants';

// import { CredentialStore, credentialStoreFactory } from './lib/reindexing/credential_store';
import { registerUpgradeAssistantUsageCollector } from './lib/telemetry';
import { versionService } from './lib/version';
import { registerRoutes } from './routes/register_routes';
import { handleEsError } from './shared_imports';
import { RouteDependencies } from './types';
import type { UpgradeAssistantConfig } from './config';
import { defaultExclusions } from './lib/data_source_exclusions';

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
  // private readonly credentialStore: CredentialStore;
  private readonly kibanaVersion: string;
  private readonly initialFeatureSet: FeatureSet;
  private readonly initialDataSourceExclusions: DataSourceExclusions;

  // Properties set at start
  private savedObjectsServiceStart?: SavedObjectsServiceStart;
  private securityPluginStart?: SecurityPluginStart;

  constructor({ logger, env, config }: PluginInitializerContext<UpgradeAssistantConfig>) {
    this.logger = logger.get();
    // used by worker and passed to routes
    // this.credentialStore = credentialStoreFactory(this.logger);
    this.kibanaVersion = env.packageInfo.version;

    const { featureSet, dataSourceExclusions } = config.get();
    this.initialFeatureSet = featureSet;
    this.initialDataSourceExclusions = Object.assign({}, defaultExclusions, dataSourceExclusions);
  }

  setup(coreSetup: CoreSetup, pluginSetup: PluginsSetup) {
    const { http, getStartServices, savedObjects } = coreSetup;
    const { usageCollection, features, licensing, logsShared, security } = pluginSetup;

    // todo where should this live
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
      // credentialStore: this.credentialStore,
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
        dataSourceExclusions: this.initialDataSourceExclusions,
        isSecurityEnabled: () => security !== undefined && security.license.isEnabled(),
      },
      current: versionService.getCurrentVersion(),
      defaultTarget: versionService.getNextMajorVersion(),
      version: versionService,
    };

    registerRoutes(dependencies);

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

    // todo move
    // The ReindexWorker uses a map of request headers that contain the authentication credentials
    // for a given reindex. We cannot currently store these in an the .kibana index b/c we do not
    // want to expose these credentials to any unauthenticated users. We also want to avoid any need
    // to add a user for a special index just for upgrading. This in-memory cache allows us to
    // process jobs without the browser staying on the page, but will require that jobs go into
    // a paused state if no Kibana nodes have the required credentials.

    // The ReindexWorker will use the credentials stored in the cache to reindex the data
    // this.reindexingService?.start({ savedObjects, elasticsearch }, { security });
  }

  stop(): void {}
}
