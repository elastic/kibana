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
} from './routes';
import { AlertingPlugin, Services } from './types';
import { AlertTypeRegistry } from './alert_type_registry';
import { AlertsClient } from './alerts_client';

export function init(server: Legacy.Server) {
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
  });

  // Register routes
  createAlertRoute(server);
  deleteAlertRoute(server);
  findRoute(server);
  getRoute(server);
  listAlertTypesRoute(server);
  updateAlertRoute(server);

  // Expose functions
  server.decorate('request', 'getAlertsClient', function() {
    const request = this;
    const savedObjectsClient = request.getSavedObjectsClient();
    const alertsClient = new AlertsClient({
      log: server.log.bind(server),
      savedObjectsClient,
      alertTypeRegistry,
      taskManager: taskManager!,
      basePath: request.getBasePath(),
    });
    return alertsClient;
  });
  const exposedFunctions: AlertingPlugin = {
    registerType: alertTypeRegistry.register.bind(alertTypeRegistry),
    listTypes: alertTypeRegistry.list.bind(alertTypeRegistry),
  };
  server.expose(exposedFunctions);
}
