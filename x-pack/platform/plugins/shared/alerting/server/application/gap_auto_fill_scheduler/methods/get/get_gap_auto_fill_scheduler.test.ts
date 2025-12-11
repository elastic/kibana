/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import type { AlertingAuthorization } from '../../../../authorization';
import { alertingAuthorizationMock } from '../../../../authorization/alerting_authorization.mock';
import { ruleTypeRegistryMock } from '../../../../rule_type_registry.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  savedObjectsClientMock,
  savedObjectsRepositoryMock,
} from '@kbn/core-saved-objects-api-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { RulesClient } from '../../../../rules_client';
import { ConnectorAdapterRegistry } from '../../../../connector_adapters/connector_adapter_registry';
import { GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import type { SavedObject } from '@kbn/core/server';
import type { GapAutoFillSchedulerSO } from '../../../../data/gap_auto_fill_scheduler/types/gap_auto_fill_scheduler';
import { transformSavedObjectToGapAutoFillSchedulerResult } from '../../transforms';

const kibanaVersion = 'v8.0.0';
const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

describe('getGapFillAutoScheduler()', () => {
  let rulesClient: RulesClient;

  beforeEach(() => {
    jest.resetAllMocks();
    rulesClient = new RulesClient({
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
      backfillClient: null as unknown as never,
      isSystemAction: jest.fn(),
      connectorAdapterRegistry: new ConnectorAdapterRegistry(),
      uiSettings: uiSettingsServiceMock.createStartContract(),
    });

    const so: SavedObject<GapAutoFillSchedulerSO> = {
      id: 'gap-1',
      type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      attributes: {
        id: 'gap-1',
        name: 'auto-fill',
        enabled: true,
        schedule: { interval: '1h' },
        gapFillRange: 'now-1d',
        maxBackfills: 100,
        numRetries: 3,
        scope: ['test-space'],
        ruleTypes: [
          { type: 'test-rule-type1', consumer: 'test-consumer' },
          { type: 'test-rule-type2', consumer: 'test-consumer' },
        ],
        ruleTypeConsumerPairs: ['test-rule-type1:test-consumer', 'test-rule-type2:test-consumer'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'elastic',
        updatedBy: 'elastic',
      },
      references: [],
    };
    unsecuredSavedObjectsClient.get.mockResolvedValue(so);
  });

  test('should successfully get gap fill auto scheduler', async () => {
    const result = await rulesClient.getGapAutoFillScheduler({ id: 'gap-1' });

    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledWith(
      GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      'gap-1'
    );

    expect(authorization.ensureAuthorized).toHaveBeenCalledTimes(2);
    expect(auditLogger.log).toHaveBeenCalledTimes(1);

    expect(result).toEqual(
      transformSavedObjectToGapAutoFillSchedulerResult({
        savedObject: await unsecuredSavedObjectsClient.get.mock.results[0].value,
      })
    );
  });

  describe('error handling', () => {
    test('should propagate saved objects get error', async () => {
      unsecuredSavedObjectsClient.get.mockImplementationOnce(() => {
        throw new Error('error getting SO!');
      });

      await expect(rulesClient.getGapAutoFillScheduler({ id: 'gap-1' })).rejects.toThrowError(
        'error getting SO!'
      );
    });

    test('should audit and throw when authorization fails', async () => {
      // return a valid SO first, then fail on auth check
      const so: SavedObject<GapAutoFillSchedulerSO> = {
        id: 'gap-1',
        type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
        attributes: {
          id: 'gap-1',
          name: 'auto-fill',
          enabled: true,
          schedule: { interval: '1h' },
          gapFillRange: 'now-1d',
          maxBackfills: 100,
          numRetries: 3,
          scope: ['test-space'],
          ruleTypes: [
            { type: 'test-rule-type1', consumer: 'test-consumer' },
            { type: 'test-rule-type2', consumer: 'test-consumer' },
          ],
          ruleTypeConsumerPairs: ['test-rule-type1:test-consumer', 'test-rule-type2:test-consumer'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'elastic',
          updatedBy: 'elastic',
        },
        references: [],
      };
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(so);

      (authorization.ensureAuthorized as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Unauthorized');
      });

      await expect(rulesClient.getGapAutoFillScheduler({ id: 'gap-1' })).rejects.toThrowError(
        'Unauthorized'
      );

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ message: 'Unauthorized' }) })
      );
    });

    test('should throw when saved object has error payload', async () => {
      const soErrorLike = {
        id: 'gap-1',
        type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
        error: { error: 'err', message: 'Unable to get', statusCode: 404 },
        attributes: { name: 'auto-fill' },
      } as unknown as SavedObject<GapAutoFillSchedulerSO>;
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(soErrorLike);

      await expect(rulesClient.getGapAutoFillScheduler({ id: 'gap-1' })).rejects.toThrowError(
        'Unable to get'
      );
    });
  });
});
