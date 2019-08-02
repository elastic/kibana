/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import {
  createAlertRoute,
  deleteAlertRoute,
  findRoute,
  getRoute,
  listAlertTypesRoute,
  updateAlertRoute,
  enableAlertRoute,
  disableAlertRoute,
} from './routes';
import { AlertingPlugin, Services } from './types';
import { AlertTypeRegistry } from './alert_type_registry';
import { AlertsClient } from './alerts_client';
import { SpacesPlugin } from '../../spaces';
import { createOptionalPlugin } from '../../../server/lib/optional_plugin';

export function init(server: Legacy.Server) {
  const config = server.config();
  const spaces = createOptionalPlugin<SpacesPlugin>(
    config,
    'xpack.spaces',
    server.plugins,
    'spaces'
  );

  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
  const savedObjectsRepositoryWithInternalUser = server.savedObjects.getSavedObjectsRepository(
    callWithInternalUser
  );

  function getServices(basePath: string): Services {
    const fakeRequest: any = {
      headers: {},
      getBasePath: () => basePath,
    };
    return {
      log: server.log.bind(server),
      callCluster: callWithInternalUser,
      savedObjectsClient: server.savedObjects.getScopedSavedObjectsClient(fakeRequest),
    };
  }

  const { taskManager } = server;
  const alertTypeRegistry = new AlertTypeRegistry({
    getServices,
    taskManager: taskManager!,
    fireAction: server.plugins.actions!.fire,
    internalSavedObjectsRepository: savedObjectsRepositoryWithInternalUser,
    getBasePath(...args) {
      return spaces.isEnabled
        ? spaces.getBasePath(...args)
        : server.config().get('server.basePath');
    },
    spaceIdToNamespace(...args) {
      return spaces.isEnabled ? spaces.spaceIdToNamespace(...args) : undefined;
    },
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

  // Expose functions
  server.decorate('request', 'getAlertsClient', function() {
    const request = this;
    const savedObjectsClient = request.getSavedObjectsClient();
    const alertsClient = new AlertsClient({
      log: server.log.bind(server),
      savedObjectsClient,
      alertTypeRegistry,
      taskManager: taskManager!,
      spaceId: spaces.isEnabled ? spaces.getSpaceId(request) : undefined,
    });
    return alertsClient;
  });
  const exposedFunctions: AlertingPlugin = {
    registerType: alertTypeRegistry.register.bind(alertTypeRegistry),
    listTypes: alertTypeRegistry.list.bind(alertTypeRegistry),
  };
  server.expose(exposedFunctions);
}
