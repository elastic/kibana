/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  savedObjectsClientMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
  coreFeatureFlagsMock,
} from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import type { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import type { ConstructorOptions } from '../rules_client';
import type { AlertingAuthorization } from '../authorization/alerting_authorization';
import { alertingAuthorizationMock } from '../authorization/alerting_authorization.mock';
import { ruleTypeRegistryMock } from '../rule_type_registry.mock';
import { ConnectorAdapterRegistry } from '../connector_adapters/connector_adapter_registry';
import { backfillClientMock } from '../backfill_client/backfill_client.mock';

/**
 * The strongly typed mocks that make up the shared {@link ConstructorOptions} used to
 * instantiate a `RulesClient` in unit tests. They are returned alongside the assembled
 * params so tests can set up expectations (e.g.
 * `unsecuredSavedObjectsClient.get.mockResolvedValue(...)`) without having to re-create
 * every mock by hand.
 */
export interface RulesClientMock {
  rulesClientParams: jest.Mocked<ConstructorOptions>;
  taskManager: ReturnType<typeof taskManagerMock.createStart>;
  ruleTypeRegistry: ReturnType<typeof ruleTypeRegistryMock.create>;
  unsecuredSavedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  encryptedSavedObjects: ReturnType<typeof encryptedSavedObjectsMock.createClient>;
  authorization: ReturnType<typeof alertingAuthorizationMock.create>;
  actionsAuthorization: ReturnType<typeof actionsAuthorizationMock.create>;
  auditLogger: ReturnType<typeof auditLoggerMock.create>;
  internalSavedObjectsRepository: ReturnType<typeof savedObjectsRepositoryMock.create>;
  logger: Logger;
  backfillClient: ReturnType<typeof backfillClientMock.create>;
}

/**
 * Builds the default `RulesClient` `ConstructorOptions` used across the alerting server unit tests.
 *
 * Centralising the construction here means adding a new `RulesClient` param only requires updating
 * this single helper instead of every unit test file. Any field can be tailored per test via
 * `overrides` (e.g. `getRulesClientMockParams({ isServerless: true })`), and the individual mocks
 * are returned so tests can drive their behaviour.
 */
export const getRulesClientMockParams = (
  overrides: Partial<jest.Mocked<ConstructorOptions>> = {}
): RulesClientMock => {
  const taskManager = taskManagerMock.createStart();
  const ruleTypeRegistry = ruleTypeRegistryMock.create();
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
  const authorization = alertingAuthorizationMock.create();
  const actionsAuthorization = actionsAuthorizationMock.create();
  const auditLogger = auditLoggerMock.create();
  const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
  const logger = loggingSystemMock.create().get();
  const backfillClient = backfillClientMock.create();

  const rulesClientParams: jest.Mocked<ConstructorOptions> = {
    taskManager,
    ruleTypeRegistry,
    unsecuredSavedObjectsClient,
    authorization: authorization as unknown as AlertingAuthorization,
    actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
    request: httpServerMock.createKibanaRequest(),
    spaceId: 'default',
    namespace: 'default',
    maxScheduledPerMinute: 10000,
    minimumScheduleInterval: { value: '1m', enforce: false },
    getUserName: jest.fn(),
    createAPIKey: jest.fn(),
    cloneAPIKey: jest.fn(),
    logger,
    internalSavedObjectsRepository,
    encryptedSavedObjectsClient: encryptedSavedObjects,
    getActionsClient: jest.fn(),
    getEventLogClient: jest.fn(),
    kibanaVersion: 'v7.10.0',
    auditLogger,
    isAuthenticationTypeAPIKey: jest.fn(),
    getAuthenticationAPIKey: jest.fn(),
    connectorAdapterRegistry: new ConnectorAdapterRegistry(),
    getAlertIndicesAlias: jest.fn(),
    alertsService: null,
    backfillClient,
    uiSettings: uiSettingsServiceMock.createStartContract(),
    isSystemAction: jest.fn(),
    featureFlags: coreFeatureFlagsMock.createStart(),
    isServerless: false,
    analytics: { reportEvent: jest.fn() },
    ...overrides,
  };

  return {
    rulesClientParams,
    taskManager,
    ruleTypeRegistry,
    unsecuredSavedObjectsClient,
    encryptedSavedObjects,
    authorization,
    actionsAuthorization,
    auditLogger,
    internalSavedObjectsRepository,
    logger,
    backfillClient,
  };
};
