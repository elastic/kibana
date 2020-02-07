/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { alertsClientMock } from '../alerts_client.mock';
import { alertTypeRegistryMock } from '../alert_type_registry.mock';

const defaultConfig = {
  'kibana.index': '.kibana',
};

export function createMockServer(config: Record<string, any> = defaultConfig) {
  const server = new Hapi.Server({
    port: 0,
  });

  const alertsClient = alertsClientMock.create();
  const alertTypeRegistry = alertTypeRegistryMock.create();

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
    name: 'alerting',
    register(pluginServer: Hapi.Server) {
      pluginServer.expose({
        setup: {
          registerType: alertTypeRegistry.register,
        },
        start: {
          listTypes: alertTypeRegistry.list,
        },
      });
    },
  });

  server.decorate('request', 'getAlertsClient', () => alertsClient);
  server.decorate('request', 'getBasePath', () => '/s/default');

  return { server, alertsClient, alertTypeRegistry };
}
