/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { AlertsClientFactory, ConstructorOpts } from './alerts_client_factory';
import { alertTypeRegistryMock } from './alert_type_registry.mock';
import { taskManagerMock } from '../../../../plugins/task_manager/server/task_manager.mock';
import { KibanaRequest } from '../../../../../src/core/server';
import { loggingServiceMock } from '../../../../../src/core/server/mocks';
import { encryptedSavedObjectsMock } from '../../../../plugins/encrypted_saved_objects/server/mocks';

jest.mock('./alerts_client');

const savedObjectsClient = jest.fn();
const securityPluginSetup = {
  authc: {
    createAPIKey: jest.fn(),
    getCurrentUser: jest.fn(),
  },
};
const alertsClientFactoryParams: jest.Mocked<ConstructorOpts> = {
  logger: loggingServiceMock.create().get(),
  taskManager: taskManagerMock.start(),
  alertTypeRegistry: alertTypeRegistryMock.create(),
  getSpaceId: jest.fn(),
  spaceIdToNamespace: jest.fn(),
  encryptedSavedObjectsPlugin: encryptedSavedObjectsMock.createStart(),
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
  alertsClientFactoryParams.spaceIdToNamespace.mockReturnValue('default');
});

test('creates an alerts client with proper constructor arguments', async () => {
  const factory = new AlertsClientFactory(alertsClientFactoryParams);
  factory.create(KibanaRequest.from(fakeRequest), fakeRequest);

  expect(jest.requireMock('./alerts_client').AlertsClient).toHaveBeenCalledWith({
    savedObjectsClient,
    logger: alertsClientFactoryParams.logger,
    taskManager: alertsClientFactoryParams.taskManager,
    alertTypeRegistry: alertsClientFactoryParams.alertTypeRegistry,
    spaceId: 'default',
    namespace: 'default',
    getUserName: expect.any(Function),
    createAPIKey: expect.any(Function),
    invalidateAPIKey: expect.any(Function),
    encryptedSavedObjectsPlugin: alertsClientFactoryParams.encryptedSavedObjectsPlugin,
  });
});

test('getUserName() returns null when security is disabled', async () => {
  const factory = new AlertsClientFactory(alertsClientFactoryParams);
  factory.create(KibanaRequest.from(fakeRequest), fakeRequest);
  const constructorCall = jest.requireMock('./alerts_client').AlertsClient.mock.calls[0][0];

  const userNameResult = await constructorCall.getUserName();
  expect(userNameResult).toEqual(null);
});

test('getUserName() returns a name when security is enabled', async () => {
  const factory = new AlertsClientFactory({
    ...alertsClientFactoryParams,
    securityPluginSetup: securityPluginSetup as any,
  });
  factory.create(KibanaRequest.from(fakeRequest), fakeRequest);
  const constructorCall = jest.requireMock('./alerts_client').AlertsClient.mock.calls[0][0];

  securityPluginSetup.authc.getCurrentUser.mockResolvedValueOnce({ username: 'bob' });
  const userNameResult = await constructorCall.getUserName();
  expect(userNameResult).toEqual('bob');
});

test('createAPIKey() returns { apiKeysEnabled: false } when security is disabled', async () => {
  const factory = new AlertsClientFactory(alertsClientFactoryParams);
  factory.create(KibanaRequest.from(fakeRequest), fakeRequest);
  const constructorCall = jest.requireMock('./alerts_client').AlertsClient.mock.calls[0][0];

  const createAPIKeyResult = await constructorCall.createAPIKey();
  expect(createAPIKeyResult).toEqual({ apiKeysEnabled: false });
});

test('createAPIKey() returns { apiKeysEnabled: false } when security is enabled but ES security is disabled', async () => {
  const factory = new AlertsClientFactory(alertsClientFactoryParams);
  factory.create(KibanaRequest.from(fakeRequest), fakeRequest);
  const constructorCall = jest.requireMock('./alerts_client').AlertsClient.mock.calls[0][0];

  securityPluginSetup.authc.createAPIKey.mockResolvedValueOnce(null);
  const createAPIKeyResult = await constructorCall.createAPIKey();
  expect(createAPIKeyResult).toEqual({ apiKeysEnabled: false });
});

test('createAPIKey() returns an API key when security is enabled', async () => {
  const factory = new AlertsClientFactory({
    ...alertsClientFactoryParams,
    securityPluginSetup: securityPluginSetup as any,
  });
  factory.create(KibanaRequest.from(fakeRequest), fakeRequest);
  const constructorCall = jest.requireMock('./alerts_client').AlertsClient.mock.calls[0][0];

  securityPluginSetup.authc.createAPIKey.mockResolvedValueOnce({ api_key: '123', id: 'abc' });
  const createAPIKeyResult = await constructorCall.createAPIKey();
  expect(createAPIKeyResult).toEqual({
    apiKeysEnabled: true,
    result: { api_key: '123', id: 'abc' },
  });
});

test('createAPIKey() throws when security plugin createAPIKey throws an error', async () => {
  const factory = new AlertsClientFactory({
    ...alertsClientFactoryParams,
    securityPluginSetup: securityPluginSetup as any,
  });
  factory.create(KibanaRequest.from(fakeRequest), fakeRequest);
  const constructorCall = jest.requireMock('./alerts_client').AlertsClient.mock.calls[0][0];

  securityPluginSetup.authc.createAPIKey.mockRejectedValueOnce(new Error('TLS disabled'));
  await expect(constructorCall.createAPIKey()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"TLS disabled"`
  );
});
