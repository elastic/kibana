/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { Logger, Services } from './types';
import { SpacesPlugin } from '../../spaces';
import { ActionsPlugin } from '../../actions';
import { AlertsClient } from './alerts_client';
import { TaskManager } from '../../task_manager';
import { AlertTypeRegistry } from './alert_type_registry';
import { XPackMainPlugin } from '../../xpack_main/xpack_main';
import { AlertsClientFactory } from './lib';
import { SavedObjectsLegacyService } from '../../../../../src/core/server';
import { EncryptedSavedObjectsPlugin } from '../../encrypted_saved_objects';
import { ElasticsearchPlugin } from '../../../../../src/legacy/core_plugins/elasticsearch';
import { PluginSetupContract as SecurityPluginSetupContract } from '../../../../plugins/security/server';
import {
  createAlertRoute,
  deleteAlertRoute,
  findAlertRoute,
  getAlertRoute,
  listAlertTypesRoute,
  updateAlertRoute,
  enableAlertRoute,
  disableAlertRoute,
  updateApiKeyRoute,
  muteAllAlertRoute,
  unmuteAllAlertRoute,
  muteAlertInstanceRoute,
  unmuteAlertInstanceRoute,
} from './routes';

interface PluginInitializerContext {
  logger: {
    get: () => Logger;
  };
}

interface CoreSetup {
  elasticsearch: ElasticsearchPlugin;
  savedObjects: SavedObjectsLegacyService;
  http: {
    route: (route: Hapi.ServerRoute) => void;
    basePath: {
      serverBasePath: string;
    };
  };
}

interface PluginsSetup {
  security?: SecurityPluginSetupContract;
  task_manager: TaskManager;
  spaces: () => SpacesPlugin | undefined;
  actions: ActionsPlugin;
  xpack_main: XPackMainPlugin;
  encrypted_saved_objects: EncryptedSavedObjectsPlugin;
}

export interface PluginSetupContract {
  listTypes: AlertTypeRegistry['list'];
  registerType: AlertTypeRegistry['register'];
  getAlertsClientWithRequest: (request: Hapi.Request) => AlertsClient;
}

export class Plugin {
  private readonly logger: Logger;
  private alertsClientFactory?: AlertsClientFactory;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: PluginsSetup): PluginSetupContract {
    const { logger } = this;
    const { callWithRequest } = core.elasticsearch.getCluster('admin');

    plugins.xpack_main.registerFeature({
      id: 'alerting',
      name: 'Alerting',
      app: ['alerting', 'kibana'],
      privileges: {
        all: {
          savedObject: {
            all: ['alert'],
            read: [],
          },
          ui: [],
          api: ['alerting-read', 'alerting-all'],
        },
        read: {
          savedObject: {
            all: [],
            read: ['alert'],
          },
          ui: [],
          api: ['alerting-read'],
        },
      },
    });

    // Encrypted attributes
    plugins.encrypted_saved_objects.registerType({
      type: 'alert',
      attributesToEncrypt: new Set(['apiKey']),
      attributesToExcludeFromAAD: new Set([
        'scheduledTaskId',
        'muted',
        'mutedInstanceIds',
        'updatedBy',
      ]),
    });

    function getServices(request: any): Services {
      return {
        logger,
        callCluster: (...args) => callWithRequest(request, ...args),
        savedObjectsClient: core.savedObjects.getScopedSavedObjectsClient(request),
      };
    }
    function getBasePath(spaceId?: string): string {
      const spacesPlugin = plugins.spaces();
      return spacesPlugin && spaceId
        ? spacesPlugin.getBasePath(spaceId)
        : core.http.basePath.serverBasePath;
    }
    function spaceIdToNamespace(spaceId?: string): string | undefined {
      const spacesPlugin = plugins.spaces();
      return spacesPlugin && spaceId ? spacesPlugin.spaceIdToNamespace(spaceId) : undefined;
    }

    const alertTypeRegistry = new AlertTypeRegistry({
      getServices,
      isSecurityEnabled: !!plugins.security,
      taskManager: plugins.task_manager,
      executeAction: plugins.actions.execute,
      encryptedSavedObjectsPlugin: plugins.encrypted_saved_objects,
      getBasePath,
      spaceIdToNamespace,
    });

    // Register routes
    core.http.route(createAlertRoute);
    core.http.route(deleteAlertRoute);
    core.http.route(findAlertRoute);
    core.http.route(getAlertRoute);
    core.http.route(listAlertTypesRoute);
    core.http.route(updateAlertRoute);
    core.http.route(enableAlertRoute);
    core.http.route(disableAlertRoute);
    core.http.route(updateApiKeyRoute);
    core.http.route(muteAllAlertRoute);
    core.http.route(unmuteAllAlertRoute);
    core.http.route(muteAlertInstanceRoute);
    core.http.route(unmuteAlertInstanceRoute);

    this.alertsClientFactory = new AlertsClientFactory({
      alertTypeRegistry,
      logger: this.logger,
      taskManager: plugins.task_manager,
      securityPluginSetup: plugins.security,
      getSpaceId(request: Hapi.Request) {
        const spacesPlugin = plugins.spaces();
        return spacesPlugin ? spacesPlugin.getSpaceId(request) : undefined;
      },
    });

    return {
      registerType: alertTypeRegistry.register.bind(alertTypeRegistry),
      listTypes: alertTypeRegistry.list.bind(alertTypeRegistry),
      getAlertsClientWithRequest: (request: Hapi.Request) =>
        this.alertsClientFactory!.create(request),
    };
  }
}
