/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { AlertingAuthorization } from '../authorization';
import { ConnectorAdapterRegistry } from '../connector_adapters/connector_adapter_registry';
import type { ConstructorOptions } from './rules_client';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import {
  savedObjectsClientMock,
  savedObjectsRepositoryMock,
} from '@kbn/core-saved-objects-api-server-mocks';
import { auditLoggerMock } from '@kbn/core-security-server-mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { alertingAuthorizationMock } from '../authorization/alerting_authorization.mock';
import { backfillClientMock } from '../backfill_client/backfill_client.mock';
import { ruleTypeRegistryMock } from '../rule_type_registry.mock';

const create = () => {
  const kibanaVersion = 'v8.17.0';
  const taskManager = taskManagerMock.createStart();
  const ruleTypeRegistry = ruleTypeRegistryMock.create();
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
  const authorization = alertingAuthorizationMock.create();
  const actionsAuthorization = actionsAuthorizationMock.create();
  const auditLogger = auditLoggerMock.create();
  const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
  const backfillClient = backfillClientMock.create();

  const rulesClientParams: jest.Mocked<ConstructorOptions> = {
    taskManager,
    ruleTypeRegistry,
    unsecuredSavedObjectsClient,
    authorization: authorization as unknown as AlertingAuthorization,
    actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
    spaceId: 'default',
    namespace: 'default',
    getUserName: jest.fn(),
    createAPIKey: jest.fn(),
    logger: loggingSystemMock.create().get(),
    internalSavedObjectsRepository,
    encryptedSavedObjectsClient: encryptedSavedObjects,
    getActionsClient: jest.fn(),
    getEventLogClient: jest.fn(),
    kibanaVersion,
    auditLogger,
    maxScheduledPerMinute: 10000,
    minimumScheduleInterval: { value: '1m', enforce: false },
    isAuthenticationTypeAPIKey: jest.fn(),
    getAuthenticationAPIKey: jest.fn(),
    getAlertIndicesAlias: jest.fn(),
    alertsService: null,
    backfillClient,
    isSystemAction: jest.fn(),
    connectorAdapterRegistry: new ConnectorAdapterRegistry(),
    uiSettings: uiSettingsServiceMock.createStartContract(),
  };

  return rulesClientParams;
};

export const rulesClientContextMock = { create };
