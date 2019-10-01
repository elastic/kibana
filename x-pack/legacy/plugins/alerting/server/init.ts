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
import { KibanaRequest } from '../../../../../src/core/server';
import { EncryptedSavedObjectsPlugin } from '../../encrypted_saved_objects';
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
  // core shim
  const coreSetup = {
    // TODO: Not sure why server.newPlatform doesn't work
    ...((server as unknown) as KbnServer).newPlatform.setup.core,
    elasticsearch: server.plugins.elasticsearch,
    savedObjects: server.savedObjects,
    http: {
      route: server.route.bind(server),
      basePath: {
        serverBasePath: server.config().get('server.basePath') || '',
      },
    },
  };
  // plugins shim
  const pluginsSetup = {
    // TODO: Not sure why server.newPlatform doesn't work
    ...((server as unknown) as KbnServer).newPlatform.setup.plugins,
    // TODO: Why?
    security: ((server as unknown) as KbnServer).newPlatform.setup.plugins.security as
      | SecurityPluginSetupContract
      | undefined,
    task_manager: server.plugins.task_manager,
    // TODO: Currently a function because it's an optional dependency that
    // initializes after this function is called
    spaces: () => server.plugins.spaces,
    actions: server.plugins.actions,
    xpack_main: server.plugins.xpack_main,
    encrypted_saved_objects: server.plugins.encrypted_saved_objects,
  };

  const taskManager = pluginsSetup.task_manager;
  const { callWithRequest } = coreSetup.elasticsearch.getCluster('admin');

  pluginsSetup.xpack_main.registerFeature({
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
  pluginsSetup.encrypted_saved_objects.registerType({
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
      log: (...args) => server.log(...args),
      callCluster: (...args) => callWithRequest(request, ...args),
      savedObjectsClient: coreSetup.savedObjects.getScopedSavedObjectsClient(request),
    };
  }
  function getBasePath(spaceId?: string): string {
    return pluginsSetup.spaces() && spaceId
      ? pluginsSetup.spaces().getBasePath(spaceId)
      : coreSetup.http.basePath.serverBasePath;
  }
  function spaceIdToNamespace(spaceId?: string): string | undefined {
    return pluginsSetup.spaces() && spaceId
      ? pluginsSetup.spaces().spaceIdToNamespace(spaceId)
      : undefined;
  }

  const alertTypeRegistry = new AlertTypeRegistry({
    getServices,
    isSecurityEnabled: !!pluginsSetup.security,
    taskManager,
    executeAction: pluginsSetup.actions.execute,
    encryptedSavedObjectsPlugin: pluginsSetup.encrypted_saved_objects,
    getBasePath,
    spaceIdToNamespace,
  });

  // Register routes
  coreSetup.http.route(createAlertRoute);
  coreSetup.http.route(deleteAlertRoute);
  coreSetup.http.route(findAlertRoute);
  coreSetup.http.route(getAlertRoute);
  coreSetup.http.route(listAlertTypesRoute);
  coreSetup.http.route(updateAlertRoute);
  coreSetup.http.route(enableAlertRoute);
  coreSetup.http.route(disableAlertRoute);
  coreSetup.http.route(updateApiKeyRoute);
  coreSetup.http.route(muteAllAlertRoute);
  coreSetup.http.route(unmuteAllAlertRoute);
  coreSetup.http.route(muteAlertInstanceRoute);
  coreSetup.http.route(unmuteAlertInstanceRoute);

  // Expose functions
  server.decorate('request', 'getAlertsClient', function() {
    const request = this;
    const savedObjectsClient = request.getSavedObjectsClient();

    const alertsClient = new AlertsClient({
      log: server.log.bind(server),
      savedObjectsClient,
      alertTypeRegistry,
      taskManager,
      spaceId: pluginsSetup.spaces() ? pluginsSetup.spaces().getSpaceId(request) : undefined,
      async getUserName(): Promise<string | null> {
        const securityPluginSetup = pluginsSetup.security;
        if (!securityPluginSetup) {
          return null;
        }
        const user = await securityPluginSetup.authc.getCurrentUser(KibanaRequest.from(request));
        return user ? user.username : null;
      },
      async createAPIKey(): Promise<CreateAPIKeyResult> {
        const securityPluginSetup = pluginsSetup.security;
        if (!securityPluginSetup) {
          return { created: false };
        }
        return {
          created: true,
          result: (await securityPluginSetup.authc.createAPIKey(KibanaRequest.from(request), {
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
