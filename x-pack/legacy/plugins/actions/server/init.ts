/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { ActionsClient } from './actions_client';
import { ActionTypeRegistry } from './action_type_registry';
import { createFireFunction } from './create_fire_function';
import { ActionsPlugin, Services } from './types';
import {
  createRoute,
  deleteRoute,
  findRoute,
  getRoute,
  updateRoute,
  listActionTypesRoute,
  fireRoute,
} from './routes';
import { registerBuiltInActionTypes } from './builtin_action_types';
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

  const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');

  // Encrypted attributes
  // - `secrets` properties will be encrypted
  // - `config` will be included in AAD
  // - everything else excluded from AAD
  server.plugins.encrypted_saved_objects!.registerType({
    type: 'action',
    attributesToEncrypt: new Set(['secrets']),
    attributesToExcludeFromAAD: new Set(['description']),
  });
  server.plugins.encrypted_saved_objects!.registerType({
    type: 'fired_action',
    attributesToEncrypt: new Set(['apiKeyId', 'generatedApiKey']),
  });

  function getServices(request: any): Services {
    return {
      log: (...args) => server.log(...args),
      callCluster: (...args) => callWithRequest(request, ...args),
      savedObjectsClient: server.savedObjects.getScopedSavedObjectsClient(request),
    };
  }

  const { taskManager } = server;
  const actionTypeRegistry = new ActionTypeRegistry({
    getServices,
    taskManager: taskManager!,
    encryptedSavedObjectsPlugin: server.plugins.encrypted_saved_objects!,
    getBasePath(...args) {
      return spaces.isEnabled
        ? spaces.getBasePath(...args)
        : server.config().get('server.basePath');
    },
    spaceIdToNamespace(...args) {
      return spaces.isEnabled ? spaces.spaceIdToNamespace(...args) : undefined;
    },
  });

  registerBuiltInActionTypes(actionTypeRegistry);

  // Routes
  createRoute(server);
  deleteRoute(server);
  getRoute(server);
  findRoute(server);
  updateRoute(server);
  listActionTypesRoute(server);
  fireRoute({
    server,
    actionTypeRegistry,
    getServices,
  });

  const fireFn = createFireFunction({
    taskManager: taskManager!,
    getScopedSavedObjectsClient: server.savedObjects.getScopedSavedObjectsClient,
    spaceIdToNamespace(...args) {
      return spaces.isEnabled ? spaces.spaceIdToNamespace(...args) : undefined;
    },
    getBasePath(...args) {
      return spaces.isEnabled
        ? spaces.getBasePath(...args)
        : server.config().get('server.basePath');
    },
  });

  // Expose functions to server
  server.decorate('request', 'getActionsClient', function() {
    const request = this;
    const savedObjectsClient = request.getSavedObjectsClient();
    const actionsClient = new ActionsClient({
      savedObjectsClient,
      actionTypeRegistry,
    });
    return actionsClient;
  });
  const exposedFunctions: ActionsPlugin = {
    fire: fireFn,
    registerType: actionTypeRegistry.register.bind(actionTypeRegistry),
    listTypes: actionTypeRegistry.list.bind(actionTypeRegistry),
  };
  server.expose(exposedFunctions);
}
