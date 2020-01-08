/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { KibanaConfig } from 'src/legacy/server/kbn_server';
import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';

import { alertsClientMock } from '../../../../../../alerting/server/alerts_client.mock';
import { actionsClientMock } from '../../../../../../actions/server/actions_client.mock';

const defaultConfig = {
  'kibana.index': '.kibana',
};

const isKibanaConfig = (config: unknown): config is KibanaConfig =>
  Object.getOwnPropertyDescriptor(config, 'get') != null &&
  Object.getOwnPropertyDescriptor(config, 'has') != null;

const assertNever = (): never => {
  throw new Error('Unexpected object');
};

const createMockKibanaConfig = (config: Record<string, string>): KibanaConfig => {
  const returnConfig = {
    get(key: string) {
      return config[key];
    },
    has(key: string) {
      return config[key] != null;
    },
  };
  if (isKibanaConfig(returnConfig)) {
    return returnConfig;
  } else {
    return assertNever();
  }
};

export const createMockServer = (config: Record<string, string> = defaultConfig) => {
  const server = new Hapi.Server({
    port: 0,
  });

  server.config = () => createMockKibanaConfig(config);

  const actionsClient = actionsClientMock.create();
  const alertsClient = alertsClientMock.create();
  const elasticsearch = {
    getCluster: jest.fn().mockImplementation(() => ({
      callWithRequest: jest.fn(),
    })),
  };
  server.decorate('request', 'getAlertsClient', () => alertsClient);
  server.decorate('request', 'getBasePath', () => '/s/default');
  server.decorate('request', 'getActionsClient', () => actionsClient);
  server.plugins.elasticsearch = (elasticsearch as unknown) as ElasticsearchPlugin;

  return { server, alertsClient, actionsClient, elasticsearch };
};

export const createMockServerWithoutAlertClientDecoration = (
  config: Record<string, string> = defaultConfig
) => {
  const serverWithoutAlertClient = new Hapi.Server({
    port: 0,
  });

  serverWithoutAlertClient.config = () => createMockKibanaConfig(config);

  const actionsClient = actionsClientMock.create();
  serverWithoutAlertClient.decorate('request', 'getBasePath', () => '/s/default');
  serverWithoutAlertClient.decorate('request', 'getActionsClient', () => actionsClient);

  return { serverWithoutAlertClient, actionsClient };
};

export const createMockServerWithoutActionClientDecoration = (
  config: Record<string, string> = defaultConfig
) => {
  const serverWithoutActionClient = new Hapi.Server({
    port: 0,
  });

  serverWithoutActionClient.config = () => createMockKibanaConfig(config);

  const alertsClient = alertsClientMock.create();
  serverWithoutActionClient.decorate('request', 'getBasePath', () => '/s/default');
  serverWithoutActionClient.decorate('request', 'getAlertsClient', () => alertsClient);

  return { serverWithoutActionClient, alertsClient };
};

export const createMockServerWithoutActionOrAlertClientDecoration = (
  config: Record<string, string> = defaultConfig
) => {
  const serverWithoutActionOrAlertClient = new Hapi.Server({
    port: 0,
  });

  serverWithoutActionOrAlertClient.config = () => createMockKibanaConfig(config);

  return {
    serverWithoutActionOrAlertClient,
  };
};
