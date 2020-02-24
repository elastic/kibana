/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { KibanaConfig } from 'src/legacy/server/kbn_server';
import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';
import { savedObjectsClientMock } from '../../../../../../../../../src/core/server/mocks';
import { alertsClientMock } from '../../../../../../alerting/server/alerts_client.mock';
import { actionsClientMock } from '../../../../../../actions/server/actions_client.mock';
import { APP_ID, SIGNALS_INDEX_KEY } from '../../../../../common/constants';
import { ServerFacade } from '../../../../types';

const defaultConfig = {
  'kibana.index': '.kibana',
  [`xpack.${APP_ID}.${SIGNALS_INDEX_KEY}`]: '.siem-signals',
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
  const savedObjectsClient = savedObjectsClientMock.create();
  const elasticsearch = {
    getCluster: jest.fn().mockImplementation(() => ({
      callWithRequest: jest.fn(),
    })),
  };
  server.decorate('request', 'getAlertsClient', () => alertsClient);
  server.decorate('request', 'getBasePath', () => '/s/default');
  server.decorate('request', 'getActionsClient', () => actionsClient);
  server.plugins.elasticsearch = (elasticsearch as unknown) as ElasticsearchPlugin;
  server.plugins.spaces = { getSpaceId: () => 'default' };
  server.decorate('request', 'getSavedObjectsClient', () => savedObjectsClient);
  return {
    server: server as ServerFacade & Hapi.Server,
    alertsClient,
    actionsClient,
    elasticsearch,
    savedObjectsClient,
  };
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

  return {
    serverWithoutAlertClient: serverWithoutAlertClient as ServerFacade & Hapi.Server,
    actionsClient,
  };
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

  return {
    serverWithoutActionClient: serverWithoutActionClient as ServerFacade & Hapi.Server,
    alertsClient,
  };
};

export const createMockServerWithoutActionOrAlertClientDecoration = (
  config: Record<string, string> = defaultConfig
) => {
  const serverWithoutActionOrAlertClient = new Hapi.Server({
    port: 0,
  });

  serverWithoutActionOrAlertClient.config = () => createMockKibanaConfig(config);

  return {
    serverWithoutActionOrAlertClient: serverWithoutActionOrAlertClient as ServerFacade &
      Hapi.Server,
  };
};

export const createMockServerWithoutSavedObjectDecoration = (
  config: Record<string, string> = defaultConfig
) => {
  const serverWithoutSavedObjectClient = new Hapi.Server({
    port: 0,
  });

  serverWithoutSavedObjectClient.config = () => createMockKibanaConfig(config);

  const actionsClient = actionsClientMock.create();
  const alertsClient = alertsClientMock.create();

  serverWithoutSavedObjectClient.decorate('request', 'getAlertsClient', () => alertsClient);
  serverWithoutSavedObjectClient.decorate('request', 'getActionsClient', () => actionsClient);
  serverWithoutSavedObjectClient.plugins.spaces = { getSpaceId: () => 'default' };
  return {
    serverWithoutSavedObjectClient: serverWithoutSavedObjectClient as ServerFacade & Hapi.Server,
    alertsClient,
    actionsClient,
  };
};

export const getMockIndexName = () =>
  jest.fn().mockImplementation(() => ({
    callWithRequest: jest.fn().mockImplementationOnce(() => 'index-name'),
  }));

export const getMockEmptyIndex = () =>
  jest.fn().mockImplementation(() => ({
    callWithRequest: jest.fn().mockImplementation(() => ({ _shards: { total: 0 } })),
  }));

export const getMockNonEmptyIndex = () =>
  jest.fn().mockImplementation(() => ({
    callWithRequest: jest.fn().mockImplementation(() => ({ _shards: { total: 1 } })),
  }));
