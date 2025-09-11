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
import { GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import type { SavedObject } from '@kbn/core/server';
import type { GapAutoFillSchedulerSO } from '../../../../data/gap_fill_auto_scheduler/types/gap_fill_auto_scheduler';
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

describe('updateGapFillAutoScheduler()', () => {
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
      getUserName: jest.fn().mockResolvedValue('elastic'),
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

    const soExisting: SavedObject<GapAutoFillSchedulerSO> = {
      id: 'gap-1',
      type: GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
      attributes: {
        id: 'gap-1',
        name: 'auto-fill',
        enabled: false,
        schedule: { interval: '1h' },
        rulesFilter: '',
        gapFillRange: 'now-1d',
        maxAmountOfGapsToProcessPerRun: 100,
        maxAmountOfRulesToProcessPerRun: 50,
        amountOfRetries: 3,
        ruleTypes: [
          { type: 'test-rule-type1', consumer: 'test-consumer' },
          { type: 'test-rule-type2', consumer: 'test-consumer' },
        ],
        scheduledTaskId: 'task-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'elastic',
        updatedBy: 'elastic',
      },
      references: [],
    };
    unsecuredSavedObjectsClient.get.mockResolvedValue(soExisting);

    const soUpdated: SavedObject<GapAutoFillSchedulerSO> = {
      id: 'gap-1',
      type: GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
      attributes: {
        ...soExisting.attributes,
        enabled: true,
      },
      references: [],
    };
    unsecuredSavedObjectsClient.update.mockResolvedValue(soUpdated);
  });

  test('should update saved object and enable task when enabled set to true', async () => {
    const result = await rulesClient.updateGapFillAutoScheduler({
      id: 'gap-1',
      updates: { enabled: true },
    });

    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledWith(
      GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
      'gap-1'
    );

    expect(authorization.ensureAuthorized).toHaveBeenCalledTimes(2);

    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
      'gap-1',
      expect.objectContaining({ updatedBy: 'elastic' })
    );

    expect(taskManager.bulkEnable).toHaveBeenCalledWith(['task-1']);
    expect(auditLogger.log).toHaveBeenCalledTimes(1);

    expect(result).toEqual(
      transformSavedObjectToGapAutoFillSchedulerResult({
        savedObject: await unsecuredSavedObjectsClient.update.mock.results[0].value,
      })
    );
  });

  test('should update schedule via task manager when schedule changed', async () => {
    await rulesClient.updateGapFillAutoScheduler({
      id: 'gap-1',
      updates: { schedule: { interval: '2h' } },
    });

    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
      'gap-1',
      expect.objectContaining({ updatedBy: 'elastic' })
    );
    expect(taskManager.bulkUpdateSchedules).toHaveBeenCalledWith(['task-1'], { interval: '2h' });
  });

  test('should audit and throw when authorization fails', async () => {
    (authorization.ensureAuthorized as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Unauthorized');
    });

    await expect(
      rulesClient.updateGapFillAutoScheduler({ id: 'gap-1', updates: { enabled: true } })
    ).rejects.toThrow('Unauthorized');

    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Unauthorized' }),
      })
    );
  });

  test('should propagate saved objects get error', async () => {
    unsecuredSavedObjectsClient.get.mockImplementationOnce(() => {
      throw new Error('error getting SO!');
    });
    await expect(
      rulesClient.updateGapFillAutoScheduler({ id: 'gap-1', updates: { enabled: true } })
    ).rejects.toThrow('error getting SO!');
  });
});
