/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import uuid from 'uuid';
import { Legacy } from 'kibana';
import KbnServer from 'src/legacy/server/kbn_server';
import { ActionsPlugin } from '../../actions';
import { TaskManager } from '../../task_manager';
import { AlertingPlugin, Services } from './types';
import { AlertTypeRegistry } from './alert_type_registry';
import { AlertsClient, CreateAPIKeyResult } from './alerts_client';
import { SpacesPlugin } from '../../spaces';
import { KibanaRequest } from '../../../../../src/core/server';
import { EncryptedSavedObjectsPlugin } from '../../encrypted_saved_objects';
import { PluginSetupContract as SecurityPluginSetupContract } from '../../../../plugins/security/server';
import { createOptionalPlugin } from '../../../server/lib/optional_plugin';
import {
  createAlertRoute,
  deleteAlertRoute,
  findRoute,
  getRoute,
  listAlertTypesRoute,
  updateAlertRoute,
  enableAlertRoute,
  disableAlertRoute,
  updateApiKeyRoute,
  muteAlertRoute,
  unmuteAlertRoute,
  muteAlertInstanceRoute,
  unmuteAlertInstanceRoute,
} from './routes';

// Extend PluginProperties to indicate which plugins are guaranteed to exist
// due to being marked as dependencies
interface Plugins extends Hapi.PluginProperties {
  actions: ActionsPlugin;
  task_manager: TaskManager;
  encrypted_saved_objects: EncryptedSavedObjectsPlugin;
}

interface Server extends Legacy.Server {
  plugins: Plugins;
}

export function init(server: Server) {
  const config = server.config();
  const kbnServer = (server as unknown) as KbnServer;
  const taskManager = server.plugins.task_manager;
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
  const spaces = createOptionalPlugin<SpacesPlugin>(
    config,
    'xpack.spaces',
    server.plugins,
    'spaces'
  );
  const security = createOptionalPlugin<SecurityPluginSetupContract>(
    config,
    'xpack.security',
    kbnServer.newPlatform.setup.plugins,
    'security'
  );

  server.plugins.xpack_main.registerFeature({
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
  server.plugins.encrypted_saved_objects.registerType({
    type: 'alert',
    attributesToEncrypt: new Set(['apiKey']),
    attributesToExcludeFromAAD: new Set(['scheduledTaskId']),
  });

  function getServices(request: any): Services {
    return {
      log: (...args) => server.log(...args),
      callCluster: (...args) => callWithRequest(request, ...args),
      savedObjectsClient: server.savedObjects.getScopedSavedObjectsClient(request),
    };
  }
  function getBasePath(spaceId?: string): string {
    return spaces.isEnabled && spaceId
      ? spaces.getBasePath(spaceId)
      : ((server.config().get('server.basePath') || '') as string);
  }
  function spaceIdToNamespace(spaceId?: string): string | undefined {
    return spaces.isEnabled && spaceId ? spaces.spaceIdToNamespace(spaceId) : undefined;
  }

  const alertTypeRegistry = new AlertTypeRegistry({
    getServices,
    isSecurityEnabled: security.isEnabled,
    taskManager,
    executeAction: server.plugins.actions.execute,
    encryptedSavedObjectsPlugin: server.plugins.encrypted_saved_objects,
    getBasePath,
    spaceIdToNamespace,
  });

  // Register routes
  createAlertRoute(server);
  deleteAlertRoute(server);
  findRoute(server);
  getRoute(server);
  listAlertTypesRoute(server);
  updateAlertRoute(server);
  enableAlertRoute(server);
  disableAlertRoute(server);
  updateApiKeyRoute(server);
  muteAlertRoute(server);
  unmuteAlertRoute(server);
  muteAlertInstanceRoute(server);
  unmuteAlertInstanceRoute(server);

  // Expose functions
  server.decorate('request', 'getAlertsClient', function() {
    const request = this;
    const savedObjectsClient = request.getSavedObjectsClient();

    const alertsClient = new AlertsClient({
      log: server.log.bind(server),
      savedObjectsClient,
      alertTypeRegistry,
      taskManager,
      spaceId: spaces.isEnabled ? spaces.getSpaceId(request) : undefined,
      async getUserName(): Promise<string | null> {
        if (!security.isEnabled) {
          return null;
        }
        const user = await security.authc.getCurrentUser(KibanaRequest.from(request));
        return user ? user.username : null;
      },
      async createAPIKey(): Promise<CreateAPIKeyResult> {
        if (!security.isEnabled) {
          return { created: false };
        }
        return {
          created: true,
          result: (await security.authc.createAPIKey(KibanaRequest.from(request), {
            name: `source: alerting, generated uuid: "${uuid.v4()}"`,
            role_descriptors: {},
          }))!,
        };
      },
    });

    return alertsClient;
  });

  const exposedFunctions: AlertingPlugin = {
    registerType: alertTypeRegistry.register.bind(alertTypeRegistry),
    listTypes: alertTypeRegistry.list.bind(alertTypeRegistry),
  };
  server.expose(exposedFunctions);
}
