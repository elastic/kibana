/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { createServiceWrapper } from './create_service_wrapper';
import { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { connectorTokenClientMock } from '@kbn/actions-plugin/server/lib/connector_token_client.mock';
import { snExternalServiceConfig } from './config';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const connectorTokenClient = connectorTokenClientMock.create();
const configurationUtilities = actionsConfigMock.create();

jest.mock('axios');
axios.create = jest.fn(() => axios);
let connectorUsageCollector: ConnectorUsageCollector;

describe('createServiceWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    connectorUsageCollector = new ConnectorUsageCollector({
      logger,
      connectorId: 'test-connector-id',
    });
  });

  test('creates axios instance with apiUrl', () => {
    const createServiceFn = jest.fn();
    const credentials = {
      config: {
        apiUrl: 'https://test-sn.service-now.com',
      },
      secrets: {
        username: 'username',
        password: 'password',
      },
    };
    const serviceConfig = snExternalServiceConfig['.servicenow'];
    createServiceWrapper({
      connectorId: '123',
      credentials,
      logger,
      configurationUtilities,
      serviceConfig,
      connectorTokenClient,
      createServiceFn,
      connectorUsageCollector,
    });

    expect(createServiceFn).toHaveBeenCalledWith({
      credentials,
      logger,
      configurationUtilities,
      serviceConfig,
      axiosInstance: axios,
      connectorUsageCollector,
    });
  });

  test('handles apiUrl with trailing slash', () => {
    const createServiceFn = jest.fn();
    const credentials = {
      config: {
        apiUrl: 'https://test-sn.service-now.com/',
      },
      secrets: {
        username: 'username',
        password: 'password',
      },
    };
    const serviceConfig = snExternalServiceConfig['.servicenow'];
    createServiceWrapper({
      connectorId: '123',
      credentials,
      logger,
      configurationUtilities,
      serviceConfig,
      connectorTokenClient,
      createServiceFn,
      connectorUsageCollector,
    });

    expect(createServiceFn).toHaveBeenCalledWith({
      credentials,
      logger,
      configurationUtilities,
      serviceConfig,
      axiosInstance: axios,
      connectorUsageCollector,
    });
  });
});
