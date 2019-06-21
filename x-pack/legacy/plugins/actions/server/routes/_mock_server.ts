/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { SavedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import { actionsClientMock } from '../actions_client.mock';
import { actionTypeRegistryMock } from '../action_type_registry.mock';

const defaultConfig = {
  'kibana.index': '.kibana',
};

export function createMockServer(config: Record<string, any> = defaultConfig) {
  const server = new Hapi.Server({
    port: 0,
  });

  const actionsClient = actionsClientMock.create();
  const actionTypeRegistry = actionTypeRegistryMock.create();
  const savedObjectsClient = SavedObjectsClientMock.create();

  server.config = () => {
    return {
      get(key: string) {
        return config[key];
      },
      has(key: string) {
        return config.hasOwnProperty(key);
      },
    };
  };

  server.register({
    name: 'actions',
    register(pluginServer: Hapi.Server) {
      pluginServer.expose('registerType', actionTypeRegistry.register);
      pluginServer.expose('listTypes', actionTypeRegistry.list);
    },
  });

  server.decorate('request', 'getSavedObjectsClient', () => savedObjectsClient);
  server.decorate('request', 'getActionsClient', () => actionsClient);

  return { server, savedObjectsClient, actionsClient, actionTypeRegistry };
}
