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
import { actionsClientMock } from '../../../../../../../../plugins/actions/server/mocks';
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
  server.plugins.elasticsearch = (elasticsearch as unknown) as ElasticsearchPlugin;
  server.plugins.spaces = { getSpaceId: () => 'default' };
  server.plugins.actions = {
    getActionsClientWithRequest: () => actionsClient,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any; // The types have really bad conflicts at the moment so I have to use any
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

  const savedObjectsClient = savedObjectsClientMock.create();
  serverWithoutAlertClient.config = () => createMockKibanaConfig(config);
  serverWithoutAlertClient.decorate('request', 'getSavedObjectsClient', () => savedObjectsClient);
  serverWithoutAlertClient.plugins.actions = {
    getActionsClientWithRequest: () => actionsClient,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any; // The types have really bad conflicts at the moment so I have to use any

  const actionsClient = actionsClientMock.create();

  return {
    serverWithoutAlertClient: serverWithoutAlertClient as ServerFacade & Hapi.Server,
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
