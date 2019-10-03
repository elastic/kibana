/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shim, Server } from './shim';
import { TaskRunnerFactory } from './lib';
import { ActionsClient } from './actions_client';
import { ActionTypeRegistry } from './action_type_registry';
import { createExecuteFunction } from './create_execute_function';
import { ActionsPlugin, Services } from './types';
import { ActionsKibanaConfig, getActionsConfigurationUtilities } from './actions_config';
import {
  createActionRoute,
  deleteActionRoute,
  findActionRoute,
  getActionRoute,
  updateActionRoute,
  listActionTypesRoute,
  getExecuteActionRoute,
} from './routes';
import { registerBuiltInActionTypes } from './builtin_action_types';

export function init(server: Server) {
  const { initializerContext, coreSetup, coreStart, pluginsSetup, pluginsStart } = shim(server);

  const config = server.config();
  const taskManager = server.plugins.task_manager;
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');

  pluginsSetup.xpack_main.registerFeature({
    id: 'actions',
    name: 'Actions',
    app: ['actions', 'kibana'],
    privileges: {
      all: {
        savedObject: {
          all: ['action', 'action_task_params'],
          read: [],
        },
        ui: [],
        api: ['actions-read', 'actions-all'],
      },
      read: {
        savedObject: {
          all: ['action_task_params'],
          read: ['action'],
        },
        ui: [],
        api: ['actions-read'],
      },
    },
  });

  // Encrypted attributes
  // - `secrets` properties will be encrypted
  // - `config` will be included in AAD
  // - everything else excluded from AAD
  pluginsSetup.encrypted_saved_objects.registerType({
    type: 'action',
    attributesToEncrypt: new Set(['secrets']),
    attributesToExcludeFromAAD: new Set(['description']),
  });
  pluginsSetup.encrypted_saved_objects.registerType({
    type: 'action_task_params',
    attributesToEncrypt: new Set(['apiKey']),
  });

  function getServices(request: any): Services {
    return {
      log: (...args) => server.log(...args),
      callCluster: (...args) => callWithRequest(request, ...args),
      savedObjectsClient: coreStart.savedObjects.getScopedSavedObjectsClient(request),
    };
  }
  function getBasePath(spaceId?: string): string {
    const spacesPlugin = pluginsStart.spaces();
    return spacesPlugin && spaceId
      ? spacesPlugin.getBasePath(spaceId)
      : coreSetup.http.basePath.serverBasePath;
  }
  function spaceIdToNamespace(spaceId?: string): string | undefined {
    const spacesPlugin = pluginsStart.spaces();
    return spacesPlugin && spaceId ? spacesPlugin.spaceIdToNamespace(spaceId) : undefined;
  }

  const taskRunnerFactory = new TaskRunnerFactory();
  const actionTypeRegistry = new ActionTypeRegistry({
    taskManager,
    taskRunnerFactory,
  });
  taskRunnerFactory.initialize({
    getServices,
    actionTypeRegistry,
    encryptedSavedObjectsPlugin: server.plugins.encrypted_saved_objects,
    getBasePath,
    spaceIdToNamespace,
    isSecurityEnabled: config.get('xpack.security.enabled'),
  });

  registerBuiltInActionTypes(
    actionTypeRegistry,
    getActionsConfigurationUtilities(config.get('xpack.actions') as ActionsKibanaConfig)
  );

  // Routes
  server.route(createActionRoute);
  server.route(deleteActionRoute);
  server.route(getActionRoute);
  server.route(findActionRoute);
  server.route(updateActionRoute);
  server.route(listActionTypesRoute);
  server.route(
    getExecuteActionRoute({
      actionTypeRegistry,
      getServices,
      encryptedSavedObjects: server.plugins.encrypted_saved_objects,
      spaces: server.plugins.spaces,
    })
  );

  const executeFn = createExecuteFunction({
    taskManager,
    getScopedSavedObjectsClient: coreStart.savedObjects.getScopedSavedObjectsClient,
    getBasePath,
    isSecurityEnabled: config.get('xpack.security.enabled'),
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
    execute: executeFn,
    registerType: actionTypeRegistry.register.bind(actionTypeRegistry),
    listTypes: actionTypeRegistry.list.bind(actionTypeRegistry),
  };
  server.expose(exposedFunctions);
}
