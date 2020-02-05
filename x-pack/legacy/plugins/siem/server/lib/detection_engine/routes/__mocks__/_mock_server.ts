/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { KibanaConfig } from 'src/legacy/server/kbn_server';
import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '../../../../../../../../../src/core/server/mocks';
import { alertsClientMock } from '../../../../../../alerting/server/alerts_client.mock';
import { actionsClientMock } from '../../../../../../../../plugins/actions/server/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { spacesServiceMock } from '../../../../../../../../plugins/spaces/server/spaces_service/spaces_service.mock';
import { APP_ID, SIGNALS_INDEX_KEY } from '../../../../../common/constants';
import { LegacySetupServices } from '../../../../plugin';

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

const createMockKibanaConfig = (config: Record<string, string> = defaultConfig): KibanaConfig => {
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

export const createMockServer = (hasAlertsClient = true) => {
  const actionsClient = actionsClientMock.create();
  const alertsClient = alertsClientMock.create();
  const elasticsearch = elasticsearchServiceMock.createSetup();
  const savedObjectsClient = savedObjectsClientMock.create();
  const spacesService = spacesServiceMock.createSetupContract();

  const server = new Hapi.Server({ port: 0 });

  server.decorate('request', 'getSavedObjectsClient', () => savedObjectsClient);
  if (hasAlertsClient) server.decorate('request', 'getAlertsClient', () => alertsClient);

  const npServices = { elasticsearch, spaces: { spacesService } };
  const legacyServices = {
    config: createMockKibanaConfig,
    plugins: {
      actions: {
        getActionsClientWithRequest: () => actionsClient,
      },
    },
    route: server.route.bind(server),
  };
  const services = ({
    ...npServices,
    ...legacyServices,
  } as unknown) as LegacySetupServices;

  return {
    inject: server.inject.bind(server),
    services,
    callClusterMock: createCallClusterMock(elasticsearch),
    alertsClient,
    actionsClient,
    savedObjectsClient,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createCallClusterMock = (elasticMock: any) => {
  const mock = jest.fn();
  elasticMock.dataClient.asScoped.mockImplementation(() => ({
    callAsCurrentUser: mock,
  }));

  return mock;
};
