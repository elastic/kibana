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
  DEFAULT_APP_CATEGORIES,
  CoreStart,
} from '@kbn/core/server';
import { type SecurityPluginStart } from '@kbn/security-plugin/server';
import { registerRoutes } from '@kbn/server-route-repository';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { i18n } from '@kbn/i18n';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
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
import { submitChangeRequest } from './lib/submit_change_request';

export type ChangeRequestsPluginSetup = ReturnType<ChangeRequestsPlugin['setup']>;
export type ChangeRequestsPluginStart = ReturnType<ChangeRequestsPlugin['start']>;
interface ChangeRequestsPluginSetupDependencies {
  features: FeaturesPluginSetup;
}
interface ChangeRequestsPluginStartDependencies {
  security: SecurityPluginStart;
  spaces: SpacesPluginStart;
}

const CHANGE_REQUESTS_FEATURE_ID = 'change_requests';

export class ChangeRequestsPlugin
  implements
    Plugin<
      ChangeRequestsPluginSetup,
      ChangeRequestsPluginStart,
      ChangeRequestsPluginSetupDependencies,
      ChangeRequestsPluginStartDependencies
    >
{
  public logger: Logger;

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
  }

  public setup(
    core: CoreSetup<ChangeRequestsPluginStartDependencies>,
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
          excludeFromBasePrivileges: true, // Admins should grant this explicitly
          app: [CHANGE_REQUESTS_FEATURE_ID],
          api: [CHANGE_REQUESTS_API_PRIVILEGES.manage, CHANGE_REQUESTS_API_PRIVILEGES.create], // Can view pending requests and approve/decline
          ui: [CHANGE_REQUESTS_UI_PRIVILEGES.manage, CHANGE_REQUESTS_UI_PRIVILEGES.create], // Can view pending requests and approve/decline
          savedObject: {
            all: [],
            read: [],
          },
        },
        // It's a bit odd because the UI shows read but this is all about creation.
        read: {
          excludeFromBasePrivileges: true, // Admins should grant this explicitly
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
        getClients: async () => {
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
          const [coreStart, pluginsStart] = await core.getStartServices();

          return {
            core: coreStart,
            security: pluginsStart.security,
            spaces: pluginsStart.spaces,
          };
        },
      },
      runDevModeChecks: false,
    });
  }

  public start(coreStart: CoreStart) {
    const scopedClusterClient = coreStart.elasticsearch.client;

    const storageAdapter = new StorageIndexAdapter<
      ChangeRequestsStorageSettings,
      { request: ChangeRequestDoc } & { _id: string }
    >(scopedClusterClient.asInternalUser, this.logger, changeRequestsStorageSettings);

    const storageClient = storageAdapter.getClient();

    return {
      submitChangeRequest: async (
        changeRequest: Omit<
          ChangeRequestDoc,
          'reviewedBy' | 'reviewComment' | 'user' | 'lastUpdatedAt' | 'submittedAt' | 'status'
        >
      ) =>
        submitChangeRequest(storageClient, {
          ...changeRequest,
          status: 'pending',
          user: 'Kibana system',
          lastUpdatedAt: new Date().toISOString(),
          submittedAt: new Date().toISOString(),
        }),
    };
  }
}
