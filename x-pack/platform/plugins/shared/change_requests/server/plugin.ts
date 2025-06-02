/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type PluginInitializerContext,
  type Plugin,
  type Logger,
  type CoreSetup,
  type KibanaRequest,
  DEFAULT_APP_CATEGORIES,
} from '@kbn/core/server';
import { registerRoutes } from '@kbn/server-route-repository';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { i18n } from '@kbn/i18n';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import { repository } from './routes/repository';
import {
  ChangeRequestDoc,
  ChangeRequestsRouteDependencies,
  ChangeRequestsStorageSettings,
} from './types';
import {
  CHANGE_REQUESTS_API_PRIVILEGES,
  CHANGE_REQUESTS_UI_PRIVILEGES,
  changeRequestsStorageSettings,
} from './constants';

export type ChangeRequestsPluginSetup = ReturnType<ChangeRequestsPlugin['setup']>;
export type ChangeRequestsPluginStart = ReturnType<ChangeRequestsPlugin['start']>;
interface ChangeRequestsPluginSetupDependencies {
  features: FeaturesPluginSetup;
}

const CHANGE_REQUESTS_FEATURE_ID = 'change_requests';

export class ChangeRequestsPlugin
  implements
    Plugin<
      ChangeRequestsPluginSetup,
      ChangeRequestsPluginStart,
      ChangeRequestsPluginSetupDependencies
    >
{
  public logger: Logger;

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
  }

  public setup(
    core: CoreSetup,
    plugins: ChangeRequestsPluginSetupDependencies
  ) {
    plugins.features.registerKibanaFeature({
      id: CHANGE_REQUESTS_FEATURE_ID,
      name: i18n.translate('xpack.streams.featureRegistry.changeRequestsFeatureName', {
        defaultMessage: 'Change request management',
      }),
      order: 600,
      category: DEFAULT_APP_CATEGORIES.management,
      scope: [KibanaFeatureScope.Security, KibanaFeatureScope.Spaces],
      app: [CHANGE_REQUESTS_FEATURE_ID],
      privileges: {
        all: {
          app: [CHANGE_REQUESTS_FEATURE_ID],
          api: [CHANGE_REQUESTS_API_PRIVILEGES.manage, CHANGE_REQUESTS_API_PRIVILEGES.create], // Can view pending requests and approve/decline
          ui: [CHANGE_REQUESTS_UI_PRIVILEGES.manage, CHANGE_REQUESTS_UI_PRIVILEGES.create], // Can view pending requests and approve/decline
          savedObject: {
            all: [],
            read: [],
          },
        },
        read: {
          app: [CHANGE_REQUESTS_FEATURE_ID],
          api: [CHANGE_REQUESTS_API_PRIVILEGES.create], // Can submit a new request for review
          ui: [CHANGE_REQUESTS_UI_PRIVILEGES.create], // Can view options to "submit for approval" and view their list of requests
          savedObject: {
            all: [],
            read: [],
          },
        },
      },
    });

    registerRoutes<ChangeRequestsRouteDependencies>({
      core,
      logger: this.logger,
      repository,
      dependencies: {
        getScopedClients: async (request: KibanaRequest) => {
          const [coreStart] = await core.getStartServices();

          const scopedClusterClient = coreStart.elasticsearch.client;

          const storageAdapter = new StorageIndexAdapter<
            ChangeRequestsStorageSettings,
            { request: ChangeRequestDoc } & { _id: string }
          >(scopedClusterClient.asInternalUser, this.logger, changeRequestsStorageSettings);

          return {
            storageClient: storageAdapter.getClient(),
          };
        },
        getStartServices: async () => {
          const [coreStart] = await core.getStartServices();

          return {
            core: coreStart,
          };
        },
      },
      runDevModeChecks: false,
    });

    // Need to return a server side client here
  }

  public start() {}
}
