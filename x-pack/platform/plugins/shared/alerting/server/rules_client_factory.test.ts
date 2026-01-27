/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientFactoryOpts } from './rules_client_factory';
import { RulesClientFactory } from './rules_client_factory';
import { ruleTypeRegistryMock } from './rule_type_registry.mock';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import {
  savedObjectsClientMock,
  savedObjectsServiceMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
  securityServiceMock,
} from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import type { PluginStartContract as ActionsStartContract } from '@kbn/actions-plugin/server';
import { actionsMock, actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { eventLogMock } from '@kbn/event-log-plugin/server/mocks';
import { alertingAuthorizationMock } from './authorization/alerting_authorization.mock';
import { alertingAuthorizationClientFactoryMock } from './alerting_authorization_client_factory.mock';
import type { AlertingAuthorization } from './authorization';
import type { AlertingAuthorizationClientFactory } from './alerting_authorization_client_factory';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import {
  AD_HOC_RUN_SAVED_OBJECT_TYPE,
  API_KEY_PENDING_INVALIDATION_TYPE,
  RULE_SAVED_OBJECT_TYPE,
  RULE_TEMPLATE_SAVED_OBJECT_TYPE,
  GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
} from './saved_objects';
import { backfillClientMock } from './backfill_client/backfill_client.mock';
import { ConnectorAdapterRegistry } from './connector_adapters/connector_adapter_registry';
import type { SavedObjectsClientContract } from '@kbn/core/server';

import type { SecurityStartMock } from '@kbn/core-security-server-mocks';
import type { ActionsAuthorizationMock } from '@kbn/actions-plugin/server/authorization/actions_authorization.mock';
import type { BackfillClient } from './backfill_client/backfill_client';

let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
let savedObjectsService: ReturnType<typeof savedObjectsServiceMock.createInternalStartContract>;
let securityPluginSetup: ReturnType<typeof securityMock.createSetup>;
let securityPluginStart: ReturnType<typeof securityMock.createStart>;
let securityService: SecurityStartMock;
let alertingAuthorization: ReturnType<typeof alertingAuthorizationMock.create>;

let rulesClientFactoryParams: jest.Mocked<RulesClientFactoryOpts>;
let alertingAuthorizationClientFactory: ReturnType<
  typeof alertingAuthorizationClientFactoryMock.createFactory
>;

let actionsAuthorization: ActionsAuthorizationMock;
let backfillClient: jest.Mocked<BackfillClient>;

jest.mock('./rules_client');
jest.mock('./authorization/alerting_authorization');

beforeEach(() => {
  jest.clearAllMocks();

  savedObjectsClient = savedObjectsClientMock.create();
  savedObjectsClient.asScopedToNamespace = jest.fn().mockReturnValue(savedObjectsClient);
  savedObjectsService = savedObjectsServiceMock.createInternalStartContract();

  securityPluginSetup = securityMock.createSetup();

  securityPluginStart = securityMock.createStart();

  securityService = securityServiceMock.createStart();

  alertingAuthorization = alertingAuthorizationMock.create();

  alertingAuthorizationClientFactory = alertingAuthorizationClientFactoryMock.createFactory();

  actionsAuthorization = actionsAuthorizationMock.create();

  const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
  backfillClient = backfillClientMock.create();

  rulesClientFactoryParams = {
    logger: loggingSystemMock.create().get(),
    taskManager: taskManagerMock.createStart(),
    ruleTypeRegistry: ruleTypeRegistryMock.create(),
    getSpaceId: jest.fn(),
    spaceIdToNamespace: jest.fn(),
    maxScheduledPerMinute: 10000,
    minimumScheduleInterval: { value: '1m', enforce: false },
    internalSavedObjectsRepository,
    encryptedSavedObjectsClient: encryptedSavedObjectsMock.createClient(),
    actions: actionsMock.createStart(),
    eventLog: eventLogMock.createStart(),
    kibanaVersion: '7.10.0',
    authorization:
      alertingAuthorizationClientFactory as unknown as AlertingAuthorizationClientFactory,
    backfillClient,
    connectorAdapterRegistry: new ConnectorAdapterRegistry(),
    uiSettings: uiSettingsServiceMock.createStartContract(),
    securityService: securityServiceMock.createStart(),
    getAlertIndicesAlias: jest.fn(),
    alertsService: null,
  };

  rulesClientFactoryParams.actions = actionsMock.createStart();
  (
    rulesClientFactoryParams.actions as jest.Mocked<ActionsStartContract>
  ).getActionsAuthorizationWithRequest.mockReturnValue(actionsAuthorization);
  rulesClientFactoryParams.getSpaceId.mockReturnValue('default');
  rulesClientFactoryParams.spaceIdToNamespace.mockReturnValue('default');
  rulesClientFactoryParams.uiSettings.asScopedToClient =
    uiSettingsServiceMock.createStartContract().asScopedToClient;
});

test('creates a rules client with proper constructor arguments when security is enabled', async () => {
  const factory = new RulesClientFactory();
  factory.initialize({
    securityPluginSetup,
    securityPluginStart,
    ...rulesClientFactoryParams,
  });
  const request = mockRouter.createKibanaRequest();

  savedObjectsService.getScopedClient.mockReturnValue(savedObjectsClient);
  alertingAuthorizationClientFactory.createForSpace.mockResolvedValue(
    alertingAuthorization as unknown as AlertingAuthorization
  );

  await factory.create(request, savedObjectsService);

  expect(savedObjectsService.getScopedClient).toHaveBeenCalledWith(request, {
    excludedExtensions: [SECURITY_EXTENSION_ID],
    includedHiddenTypes: [
      RULE_SAVED_OBJECT_TYPE,
      RULE_TEMPLATE_SAVED_OBJECT_TYPE,
      API_KEY_PENDING_INVALIDATION_TYPE,
      AD_HOC_RUN_SAVED_OBJECT_TYPE,
      GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
    ],
  });

  expect(alertingAuthorizationClientFactory.createForSpace).toHaveBeenCalledWith(
    request,
    'default'
  );

  expect(rulesClientFactoryParams.actions.getActionsAuthorizationWithRequest).toHaveBeenCalledWith(
    request
  );

  expect(jest.requireMock('./rules_client').RulesClient).toHaveBeenCalledWith({
    auditLogger: {
      enabled: true,
      includeSavedObjectNames: false,
      log: expect.any(Function),
    },
    unsecuredSavedObjectsClient: savedObjectsClient,
    authorization: alertingAuthorization,
    actionsAuthorization,
    logger: rulesClientFactoryParams.logger,
    taskManager: rulesClientFactoryParams.taskManager,
    ruleTypeRegistry: rulesClientFactoryParams.ruleTypeRegistry,
    spaceId: 'default',
    namespace: 'default',
    getUserName: expect.any(Function),
    getActionsClient: expect.any(Function),
    getEventLogClient: expect.any(Function),
    createAPIKey: expect.any(Function),
    internalSavedObjectsRepository: rulesClientFactoryParams.internalSavedObjectsRepository,
    encryptedSavedObjectsClient: rulesClientFactoryParams.encryptedSavedObjectsClient,
    kibanaVersion: '7.10.0',
    maxScheduledPerMinute: 10000,
    minimumScheduleInterval: { value: '1m', enforce: false },
    isAuthenticationTypeAPIKey: expect.any(Function),
    getAuthenticationAPIKey: expect.any(Function),
    connectorAdapterRegistry: expect.any(ConnectorAdapterRegistry),
    isSystemAction: expect.any(Function),
    getAlertIndicesAlias: expect.any(Function),
    alertsService: null,
    backfillClient,
    uiSettings: rulesClientFactoryParams.uiSettings,
  });
});

test('creates a rules client with proper constructor arguments', async () => {
  const factory = new RulesClientFactory();
  factory.initialize(rulesClientFactoryParams);
  const request = mockRouter.createKibanaRequest();

  savedObjectsService.getScopedClient.mockReturnValue(savedObjectsClient);
  alertingAuthorizationClientFactory.createForSpace.mockResolvedValue(
    alertingAuthorization as unknown as AlertingAuthorization
  );

  await factory.create(request, savedObjectsService);

  expect(savedObjectsService.getScopedClient).toHaveBeenCalledWith(request, {
    excludedExtensions: [SECURITY_EXTENSION_ID],
    includedHiddenTypes: [
      RULE_SAVED_OBJECT_TYPE,
      RULE_TEMPLATE_SAVED_OBJECT_TYPE,
      API_KEY_PENDING_INVALIDATION_TYPE,
      AD_HOC_RUN_SAVED_OBJECT_TYPE,
      GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
    ],
  });

  expect(alertingAuthorizationClientFactory.createForSpace).toHaveBeenCalledWith(
    request,
    'default'
  );

  expect(jest.requireMock('./rules_client').RulesClient).toHaveBeenCalledWith({
    unsecuredSavedObjectsClient: savedObjectsClient,
    authorization: alertingAuthorization,
    actionsAuthorization,
    logger: rulesClientFactoryParams.logger,
    taskManager: rulesClientFactoryParams.taskManager,
    ruleTypeRegistry: rulesClientFactoryParams.ruleTypeRegistry,
    spaceId: 'default',
    namespace: 'default',
    getUserName: expect.any(Function),
    createAPIKey: expect.any(Function),
    internalSavedObjectsRepository: rulesClientFactoryParams.internalSavedObjectsRepository,
    encryptedSavedObjectsClient: rulesClientFactoryParams.encryptedSavedObjectsClient,
    getActionsClient: expect.any(Function),
    getEventLogClient: expect.any(Function),
    kibanaVersion: '7.10.0',
    maxScheduledPerMinute: 10000,
    minimumScheduleInterval: { value: '1m', enforce: false },
    isAuthenticationTypeAPIKey: expect.any(Function),
    getAuthenticationAPIKey: expect.any(Function),
    connectorAdapterRegistry: expect.any(ConnectorAdapterRegistry),
    isSystemAction: expect.any(Function),
    getAlertIndicesAlias: expect.any(Function),
    alertsService: null,
    backfillClient,
    uiSettings: rulesClientFactoryParams.uiSettings,
  });
});

test('getUserName() returns null when security is disabled', async () => {
  const factory = new RulesClientFactory();
  factory.initialize(rulesClientFactoryParams);
  await factory.create(mockRouter.createKibanaRequest(), savedObjectsService);
  const constructorCall = jest.requireMock('./rules_client').RulesClient.mock.calls[0][0];

  const userNameResult = await constructorCall.getUserName();
  expect(userNameResult).toEqual(null);
});

test('getUserName() returns a name when security is enabled', async () => {
  const factory = new RulesClientFactory();
  factory.initialize({
    ...rulesClientFactoryParams,
    securityService,
  });
  await factory.create(mockRouter.createKibanaRequest(), savedObjectsService);
  const constructorCall = jest.requireMock('./rules_client').RulesClient.mock.calls[0][0];

  securityService.authc.getCurrentUser.mockReturnValueOnce({
    username: 'bob',
  } as unknown as AuthenticatedUser);
  const userNameResult = await constructorCall.getUserName();
  expect(userNameResult).toEqual('bob');
});

test('getActionsClient() returns ActionsClient', async () => {
  const factory = new RulesClientFactory();
  factory.initialize(rulesClientFactoryParams);
  await factory.create(mockRouter.createKibanaRequest(), savedObjectsService);
  const constructorCall = jest.requireMock('./rules_client').RulesClient.mock.calls[0][0];

  const actionsClient = await constructorCall.getActionsClient();
  expect(actionsClient).not.toBe(null);
});

test('createAPIKey() returns { apiKeysEnabled: false } when security is disabled', async () => {
  const factory = new RulesClientFactory();
  factory.initialize(rulesClientFactoryParams);
  await factory.create(mockRouter.createKibanaRequest(), savedObjectsService);
  const constructorCall = jest.requireMock('./rules_client').RulesClient.mock.calls[0][0];

  const createAPIKeyResult = await constructorCall.createAPIKey();
  expect(createAPIKeyResult).toEqual({ apiKeysEnabled: false });
});

test('createAPIKey() returns { apiKeysEnabled: false } when security is enabled but ES security is disabled', async () => {
  const factory = new RulesClientFactory();
  factory.initialize(rulesClientFactoryParams);
  await factory.create(mockRouter.createKibanaRequest(), savedObjectsService);
  const constructorCall = jest.requireMock('./rules_client').RulesClient.mock.calls[0][0];

  securityPluginStart.authc.apiKeys.grantAsInternalUser.mockResolvedValueOnce(null);
  const createAPIKeyResult = await constructorCall.createAPIKey();
  expect(createAPIKeyResult).toEqual({ apiKeysEnabled: false });
});

test('createAPIKey() returns an API key when security is enabled', async () => {
  const factory = new RulesClientFactory();
  factory.initialize({
    ...rulesClientFactoryParams,
    securityService,
    securityPluginSetup,
    securityPluginStart,
  });
  await factory.create(mockRouter.createKibanaRequest(), savedObjectsService);
  const constructorCall = jest.requireMock('./rules_client').RulesClient.mock.calls[0][0];

  securityPluginStart.authc.apiKeys.grantAsInternalUser.mockResolvedValueOnce({
    api_key: '123',
    id: 'abc',
    name: '',
  });
  const createAPIKeyResult = await constructorCall.createAPIKey('test');
  expect(createAPIKeyResult).toEqual({
    apiKeysEnabled: true,
    result: { api_key: '123', id: 'abc', name: '' },
  });
  expect(securityPluginStart.authc.apiKeys.grantAsInternalUser).toHaveBeenCalledWith(
    expect.any(Object),
    {
      metadata: { managed: true, kibana: { type: 'alerting_rule' } },
      name: 'test',
      role_descriptors: {},
    }
  );
});

test('createAPIKey() throws when security plugin createAPIKey throws an error', async () => {
  const factory = new RulesClientFactory();
  factory.initialize({
    ...rulesClientFactoryParams,
    securityService,
    securityPluginSetup,
    securityPluginStart,
  });
  await factory.create(mockRouter.createKibanaRequest(), savedObjectsService);
  const constructorCall = jest.requireMock('./rules_client').RulesClient.mock.calls[0][0];

  securityPluginStart.authc.apiKeys.grantAsInternalUser.mockRejectedValueOnce(
    new Error('TLS disabled')
  );
  await expect(constructorCall.createAPIKey()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"TLS disabled"`
  );
});

test('create() calls getSpaceId to derive spaceId from request', async () => {
  const factory = new RulesClientFactory();
  factory.initialize(rulesClientFactoryParams);
  const request = mockRouter.createKibanaRequest();

  savedObjectsService.getScopedClient.mockReturnValue(savedObjectsClient);
  alertingAuthorizationClientFactory.createForSpace.mockResolvedValue(
    alertingAuthorization as unknown as AlertingAuthorization
  );

  await factory.create(request, savedObjectsService);

  expect(rulesClientFactoryParams.getSpaceId).toHaveBeenCalledWith(request);
  expect(alertingAuthorizationClientFactory.createForSpace).toHaveBeenCalledWith(
    request,
    'default'
  );
});

test('createWithSpaceId() uses the provided spaceId instead of deriving from request', async () => {
  const factory = new RulesClientFactory();
  factory.initialize(rulesClientFactoryParams);
  const request = mockRouter.createKibanaRequest();

  savedObjectsService.getScopedClient.mockReturnValue(savedObjectsClient);
  alertingAuthorizationClientFactory.createForSpace.mockResolvedValue(
    alertingAuthorization as unknown as AlertingAuthorization
  );

  await factory.createWithSpaceId(request, savedObjectsService, 'custom-space');

  // getSpaceId should NOT be called when using createWithSpaceId
  expect(rulesClientFactoryParams.getSpaceId).not.toHaveBeenCalled();

  // createForSpace should be called with the provided spaceId
  expect(alertingAuthorizationClientFactory.createForSpace).toHaveBeenCalledWith(
    request,
    'custom-space'
  );

  // Saved objects client should be scoped to the custom namespace
  expect(savedObjectsClient.asScopedToNamespace).toHaveBeenCalledWith('custom-space');

  // RulesClient should be created with the custom spaceId
  expect(jest.requireMock('./rules_client').RulesClient).toHaveBeenCalledWith(
    expect.objectContaining({
      spaceId: 'custom-space',
    })
  );
});

test('create() uses request-derived client methods for actions and event log', async () => {
  const factory = new RulesClientFactory();
  factory.initialize(rulesClientFactoryParams);
  const request = mockRouter.createKibanaRequest();

  savedObjectsService.getScopedClient.mockReturnValue(savedObjectsClient);
  alertingAuthorizationClientFactory.createForSpace.mockResolvedValue(
    alertingAuthorization as unknown as AlertingAuthorization
  );

  await factory.create(request, savedObjectsService);

  const constructorCall = jest.requireMock('./rules_client').RulesClient.mock.calls[0][0];

  // Call getActionsClient and verify it uses the request-derived method
  await constructorCall.getActionsClient();
  expect(rulesClientFactoryParams.actions.getActionsClientWithRequest).toHaveBeenCalledWith(
    request
  );
  expect(
    rulesClientFactoryParams.actions.getActionsClientWithRequestInSpace
  ).not.toHaveBeenCalled();

  // Call getEventLogClient and verify it uses the request-derived method
  await constructorCall.getEventLogClient();
  expect(rulesClientFactoryParams.eventLog.getClient).toHaveBeenCalledWith(request);
  expect(rulesClientFactoryParams.eventLog.getClientWithRequestInSpace).not.toHaveBeenCalled();
});

test('createWithSpaceId() uses space-scoped client methods for actions and event log', async () => {
  const factory = new RulesClientFactory();
  factory.initialize(rulesClientFactoryParams);
  const request = mockRouter.createKibanaRequest();

  savedObjectsService.getScopedClient.mockReturnValue(savedObjectsClient);
  alertingAuthorizationClientFactory.createForSpace.mockResolvedValue(
    alertingAuthorization as unknown as AlertingAuthorization
  );

  await factory.createWithSpaceId(request, savedObjectsService, 'custom-space');

  const constructorCall = jest.requireMock('./rules_client').RulesClient.mock.calls[0][0];

  // Call getActionsClient and verify it uses the space-scoped method
  await constructorCall.getActionsClient();
  expect(rulesClientFactoryParams.actions.getActionsClientWithRequestInSpace).toHaveBeenCalledWith(
    request,
    'custom-space'
  );
  expect(rulesClientFactoryParams.actions.getActionsClientWithRequest).not.toHaveBeenCalled();

  // Call getEventLogClient and verify it uses the space-scoped method
  await constructorCall.getEventLogClient();
  expect(rulesClientFactoryParams.eventLog.getClientWithRequestInSpace).toHaveBeenCalledWith(
    request,
    'custom-space'
  );
  expect(rulesClientFactoryParams.eventLog.getClient).not.toHaveBeenCalled();
});
