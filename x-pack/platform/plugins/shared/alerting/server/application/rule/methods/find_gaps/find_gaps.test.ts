/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { AlertingAuthorization } from '../../../../authorization';
import { alertingAuthorizationMock } from '../../../../authorization/alerting_authorization.mock';
import { ruleTypeRegistryMock } from '../../../../rule_type_registry.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  savedObjectsClientMock,
  savedObjectsRepositoryMock,
} from '@kbn/core-saved-objects-api-server-mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { backfillClientMock } from '../../../../backfill_client/backfill_client.mock';
import { ConnectorAdapterRegistry } from '../../../../connector_adapters/connector_adapter_registry';
import { ConstructorOptions, RulesClient } from '../../../../rules_client';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { ReadOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { getRule } from '../get/get_rule';

jest.mock('../get/get_rule');

const mockedGetRule = getRule as jest.MockedFunction<typeof getRule>;

const mockRule = {
  id: '1',
  name: 'Test Rule',
  alertTypeId: 'test-type',
  consumer: 'test-consumer',
  enabled: true,
  tags: [],
  actions: [],
  schedule: { interval: '1m' },
  createdAt: new Date(),
  updatedAt: new Date(),
  params: {},
  executionStatus: {
    status: 'ok' as const,
    lastExecutionDate: new Date(),
  },
  notifyWhen: 'onActiveAlert' as const,
  muteAll: false,
  mutedInstanceIds: [],
  updatedBy: null,
  createdBy: null,
  apiKeyOwner: null,
  throttle: null,
  legacyId: null,
  revision: 1,
};

describe('findGaps', () => {
  let rulesClient: RulesClient;
  let eventLogClient: ReturnType<typeof eventLogClientMock.create>;
  let rulesClientParams: jest.Mocked<ConstructorOptions>;

  const kibanaVersion = 'v8.0.0';
  const taskManager = taskManagerMock.createStart();
  const ruleTypeRegistry = ruleTypeRegistryMock.create();
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
  const authorization = alertingAuthorizationMock.create();
  const actionsAuthorization = actionsAuthorizationMock.create();
  const auditLogger = auditLoggerMock.create();
  const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
  const backfillClient = backfillClientMock.create();
  const logger = loggingSystemMock.create().get();
  const eventLogger = eventLoggerMock.create();

  const params = {
    ruleId: '1',
    page: 1,
    perPage: 10,
    start: '2024-01-01T00:00:00.000Z',
    end: '2024-01-02T00:00:00.000Z',
  };

  beforeEach(() => {
    eventLogClient = eventLogClientMock.create();

    rulesClientParams = {
      taskManager,
      ruleTypeRegistry,
      unsecuredSavedObjectsClient,
      authorization: authorization as unknown as AlertingAuthorization,
      actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
      spaceId: 'default',
      namespace: 'default',
      getUserName: jest.fn(),
      createAPIKey: jest.fn(),
      logger,
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
      eventLogger,
    } as jest.Mocked<ConstructorOptions>;

    jest.clearAllMocks();
    rulesClient = new RulesClient(rulesClientParams);
    rulesClientParams.getEventLogClient.mockResolvedValue(eventLogClient);

    // Mock getRule to return mock rule
    mockedGetRule.mockResolvedValue(mockRule);

    // Mock eventLogClient.findEventsBySavedObjectIds
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValue({
      total: 0,
      data: [],
      page: 1,
      per_page: 10,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('authorization', () => {
    it('should authorize and find gaps successfully', async () => {
      await rulesClient.findGaps(params);

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        ruleTypeId: mockRule.alertTypeId,
        consumer: mockRule.consumer,
        operation: ReadOperations.FindGaps,
        entity: AlertingAuthorizationEntity.Rule,
      });
    });

    it('should throw error when not authorized', async () => {
      const authError = new Error('Unauthorized');
      authorization.ensureAuthorized.mockRejectedValue(authError);

      await expect(rulesClient.findGaps(params)).rejects.toThrow(authError);
    });
  });

  describe('auditLogger', () => {
    it('logs audit event when finding gaps successfully', async () => {
      await rulesClient.findGaps(params);

      expect(rulesClientParams.auditLogger!.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_find_gaps',
            outcome: 'success',
          }),
          kibana: { saved_object: { id: '1', type: RULE_SAVED_OBJECT_TYPE, name: 'Test Rule' } },
        })
      );
    });

    it('logs audit event when not authorized to find gaps', async () => {
      const authError = new Error('Unauthorized');
      authorization.ensureAuthorized.mockRejectedValue(authError);

      await expect(rulesClient.findGaps(params)).rejects.toThrow(authError);

      expect(rulesClientParams.auditLogger!.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_find_gaps',
            outcome: 'failure',
          }),
          kibana: { saved_object: { id: '1', type: RULE_SAVED_OBJECT_TYPE, name: 'Test Rule' } },
          error: {
            code: 'Error',
            message: 'Unauthorized',
          },
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle and wrap errors from getRule', async () => {
      const error = new Error('Rule not found');
      mockedGetRule.mockRejectedValue(error);

      await expect(rulesClient.findGaps(params)).rejects.toThrow('Failed to find gaps');
      expect(rulesClientParams.logger!.error).toHaveBeenCalled();
    });

    it('should handle errors from findGaps implementation', async () => {
      const error = new Error('Failed to find gaps');
      eventLogClient.findEventsBySavedObjectIds.mockRejectedValue(error);

      await expect(rulesClient.findGaps(params)).rejects.toThrow('Failed to find gaps');
      expect(rulesClientParams.logger!.error).toHaveBeenCalled();
    });
  });
});
