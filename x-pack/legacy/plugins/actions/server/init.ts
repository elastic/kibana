/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { first } from 'rxjs/operators';
import { shim, Server } from './shim';
import { TaskRunnerFactory } from './lib';
import { ActionsClient } from './actions_client';
import { ActionTypeRegistry } from './action_type_registry';
import { createExecuteFunction } from './create_execute_function';
import { ActionsPlugin, Services } from './types';
import { KibanaRequest } from '../../../../../src/core/server';
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

export async function init(server: Server) {
  const { initializerContext, coreSetup, coreStart, pluginsSetup, pluginsStart } = shim(server);

  const config$ = Rx.of({
    enabled: server.config().get('xpack.actions.enabled'),
    whitelistedHosts: server.config().get('xpack.actions.whitelistedHosts'),
  });
  const config = await config$.pipe(first()).toPromise();
  const logger = initializerContext.logger.get('plugins', 'actions');
  const adminClient = await coreSetup.elasticsearch.adminClient$.pipe(first()).toPromise();

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
      callCluster: (...args) =>
        adminClient.asScoped(KibanaRequest.from(request)).callAsCurrentUser(...args),
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
    taskRunnerFactory,
    taskManager: pluginsSetup.task_manager,
  });
  taskRunnerFactory.initialize({
    logger,
    getServices,
    actionTypeRegistry,
    encryptedSavedObjectsPlugin: pluginsStart.encrypted_saved_objects,
    getBasePath,
    spaceIdToNamespace,
    isSecurityEnabled: !!pluginsStart.security,
  });

  registerBuiltInActionTypes({
    logger,
    actionTypeRegistry,
    actionsConfigUtils: getActionsConfigurationUtilities(config as ActionsKibanaConfig),
  });

  // Routes
  coreSetup.http.route(createActionRoute);
  coreSetup.http.route(deleteActionRoute);
  coreSetup.http.route(getActionRoute);
  coreSetup.http.route(findActionRoute);
  coreSetup.http.route(updateActionRoute);
  coreSetup.http.route(listActionTypesRoute);
  coreSetup.http.route(
    getExecuteActionRoute({
      logger,
      actionTypeRegistry,
      getServices,
      encryptedSavedObjects: server.plugins.encrypted_saved_objects,
      spaces: server.plugins.spaces,
    })
  );

  const executeFn = createExecuteFunction({
    taskManager: pluginsStart.task_manager,
    getScopedSavedObjectsClient: coreStart.savedObjects.getScopedSavedObjectsClient,
    getBasePath,
    isSecurityEnabled: !!pluginsStart.security,
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
