/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { Legacy } from 'kibana';
import { TaskManager } from '../../task_manager';
import { ActionsClient } from './actions_client';
import { ActionTypeRegistry } from './action_type_registry';
import { createExecuteFunction } from './create_execute_function';
import { ActionsPlugin, Services } from './types';
import { ActionsKibanaConfig, getActionsConfigurationUtilities } from './actions_config';
import { EncryptedSavedObjectsPlugin } from '../../encrypted_saved_objects';
import {
  createRoute,
  deleteRoute,
  findRoute,
  getRoute,
  updateRoute,
  listActionTypesRoute,
  executeRoute,
} from './routes';
import { registerBuiltInActionTypes } from './builtin_action_types';
import { SpacesPlugin } from '../../spaces';
import { createOptionalPlugin } from '../../../server/lib/optional_plugin';

// Extend PluginProperties to indicate which plugins are guaranteed to exist
// due to being marked as dependencies
interface Plugins extends Hapi.PluginProperties {
  task_manager: TaskManager;
  encrypted_saved_objects: EncryptedSavedObjectsPlugin;
}

interface Server extends Legacy.Server {
  plugins: Plugins;
}

export function init(server: Server) {
  const config = server.config();
  const taskManager = server.plugins.task_manager;
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
  const spaces = createOptionalPlugin<SpacesPlugin>(
    config,
    'xpack.spaces',
    server.plugins,
    'spaces'
  );

  server.plugins.xpack_main.registerFeature({
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
  server.plugins.encrypted_saved_objects.registerType({
    type: 'action',
    attributesToEncrypt: new Set(['secrets']),
    attributesToExcludeFromAAD: new Set(['description']),
  });
  server.plugins.encrypted_saved_objects.registerType({
    type: 'action_task_params',
    attributesToEncrypt: new Set(['apiKey']),
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

  const actionTypeRegistry = new ActionTypeRegistry({
    getServices,
    taskManager,
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
  createRoute(server);
  deleteRoute(server);
  getRoute(server);
  findRoute(server);
  updateRoute(server);
  listActionTypesRoute(server);
  executeRoute({
    server,
    actionTypeRegistry,
    getServices,
  });

  const executeFn = createExecuteFunction({
    taskManager,
    getScopedSavedObjectsClient: server.savedObjects.getScopedSavedObjectsClient,
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
