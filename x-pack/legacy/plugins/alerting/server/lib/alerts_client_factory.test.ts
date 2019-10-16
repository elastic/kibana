/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { AlertsClientFactory, ConstructorOpts } from './alerts_client_factory';
import { alertTypeRegistryMock } from '../alert_type_registry.mock';
import { taskManagerMock } from '../../../task_manager/task_manager.mock';
import { KibanaRequest } from '../../../../../../src/core/server';
import { loggingServiceMock } from '../../../../../../src/core/server/mocks';

jest.mock('../alerts_client');

const savedObjectsClient = jest.fn();
const securityPluginSetup = {
  authc: {
    createAPIKey: jest.fn(),
    getCurrentUser: jest.fn(),
  },
};
const alertsClientFactoryParams: jest.Mocked<ConstructorOpts> = {
  logger: loggingServiceMock.create().get(),
  taskManager: taskManagerMock.create(),
  alertTypeRegistry: alertTypeRegistryMock.create(),
  getSpaceId: jest.fn(),
};
const fakeRequest: Request = {
  headers: {},
  getBasePath: () => '',
  path: '/',
  route: { settings: {} },
  url: {
    href: '/',
  },
  raw: {
    req: {
      url: '/',
    },
  },
  getSavedObjectsClient: () => savedObjectsClient,
} as any;

beforeEach(() => {
  jest.resetAllMocks();
  alertsClientFactoryParams.getSpaceId.mockReturnValue('default');
});

test('creates an alerts client with proper constructor arguments', async () => {
  const factory = new AlertsClientFactory(alertsClientFactoryParams);
  factory.create(KibanaRequest.from(fakeRequest), fakeRequest);

  expect(jest.requireMock('../alerts_client').AlertsClient).toHaveBeenCalledWith({
    savedObjectsClient,
    logger: alertsClientFactoryParams.logger,
    taskManager: alertsClientFactoryParams.taskManager,
    alertTypeRegistry: alertsClientFactoryParams.alertTypeRegistry,
    spaceId: 'default',
    getUserName: expect.any(Function),
    createAPIKey: expect.any(Function),
  });
});

test('getUserName() returns null when security is disabled', async () => {
  const factory = new AlertsClientFactory(alertsClientFactoryParams);
  factory.create(KibanaRequest.from(fakeRequest), fakeRequest);
  const constructorCall = jest.requireMock('../alerts_client').AlertsClient.mock.calls[0][0];

  const userNameResult = await constructorCall.getUserName();
  expect(userNameResult).toEqual(null);
});

test('getUserName() returns a name when security is enabled', async () => {
  const factory = new AlertsClientFactory({
    ...alertsClientFactoryParams,
    securityPluginSetup: securityPluginSetup as any,
  });
  factory.create(KibanaRequest.from(fakeRequest), fakeRequest);
  const constructorCall = jest.requireMock('../alerts_client').AlertsClient.mock.calls[0][0];

  securityPluginSetup.authc.getCurrentUser.mockResolvedValueOnce({ username: 'bob' });
  const userNameResult = await constructorCall.getUserName();
  expect(userNameResult).toEqual('bob');
});

test('createAPIKey() returns { created: false } when security is disabled', async () => {
  const factory = new AlertsClientFactory(alertsClientFactoryParams);
  factory.create(KibanaRequest.from(fakeRequest), fakeRequest);
  const constructorCall = jest.requireMock('../alerts_client').AlertsClient.mock.calls[0][0];

  const createAPIKeyResult = await constructorCall.createAPIKey();
  expect(createAPIKeyResult).toEqual({ created: false });
});

test('createAPIKey() returns an API key when security is enabled', async () => {
  const factory = new AlertsClientFactory({
    ...alertsClientFactoryParams,
    securityPluginSetup: securityPluginSetup as any,
  });
  factory.create(KibanaRequest.from(fakeRequest), fakeRequest);
  const constructorCall = jest.requireMock('../alerts_client').AlertsClient.mock.calls[0][0];

  securityPluginSetup.authc.createAPIKey.mockResolvedValueOnce({ api_key: '123', id: 'abc' });
  const createAPIKeyResult = await constructorCall.createAPIKey();
  expect(createAPIKeyResult).toEqual({ created: true, result: { api_key: '123', id: 'abc' } });
});
