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
import type { GapAutoFillSchedulerSO } from '../../../../data/gap_fill_auto_scheduler/types/gap_fill_auto_scheduler';
import type { SavedObject } from '@kbn/core/server';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import type {
  IEventLogClient,
  QueryEventsBySavedObjectResult,
} from '@kbn/event-log-plugin/server/types';

const kibanaVersion = 'v8.0.0';
const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

describe('getGapFillAutoSchedulerLogs()', () => {
  let rulesClient: RulesClient;
  const eventLogClient: jest.Mocked<IEventLogClient> = eventLogClientMock.create();

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
      getEventLogClient: jest.fn().mockResolvedValue(eventLogClient),
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
      type: GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
      attributes: {
        id: 'gap-1',
        name: 'auto-fill',
        enabled: true,
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
    unsecuredSavedObjectsClient.get.mockResolvedValue(so);

    const rawEvent = {
      '@timestamp': '2025-09-11T10:00:00.000Z',
      message: 'Gap fill execution',
      kibana: {
        auto_gap_fill: {
          execution: {
            status: 'success',
            duration_ms: 123,
            config: {
              name: 'auto-fill',
              max_amount_of_gaps_to_process_per_run: 100,
              max_amount_of_rules_to_process_per_run: 50,
              amount_of_retries: 3,
              rules_filter: '',
              gap_fill_range: 'now-1d',
              schedule: { interval: '1h' },
            },
            summary: {
              total_rules: 2,
              successful_rules: 2,
              failed_rules: 0,
              total_gaps_processed: 10,
            },
            results: [
              { rule_id: 'r-1', processed_gaps: 5, status: 'success' },
              { rule_id: 'r-2', processed_gaps: 5, status: 'success' },
            ],
          },
        },
      },
    };

    const result: QueryEventsBySavedObjectResult = {
      data: [rawEvent as unknown as QueryEventsBySavedObjectResult['data'][number]],
      total: 1,
      page: 1,
      per_page: 50,
    };
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValue(result);
  });

  test('should fetch logs for the scheduler task and transform result', async () => {
    const result = await rulesClient.getGapFillAutoSchedulerLogs({ id: 'gap-1' });

    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledWith(
      GAP_FILL_AUTO_SCHEDULER_SAVED_OBJECT_TYPE,
      'gap-1'
    );

    expect(authorization.ensureAuthorized).toHaveBeenCalledTimes(2);
    expect(eventLogClient.findEventsBySavedObjectIds).toHaveBeenCalledWith(
      'task',
      ['task-1'],
      expect.any(Object)
    );
    expect(auditLogger.log).toHaveBeenCalledTimes(1);

    expect(result.total).toBe(1);
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        timestamp: '2025-09-11T10:00:00.000Z',
        status: 'success',
        durationMs: 123,
        summary: expect.objectContaining({ totalRules: 2, successfulRules: 2, failedRules: 0 }),
        config: expect.objectContaining({ name: 'auto-fill', schedule: { interval: '1h' } }),
        results: [
          expect.objectContaining({ ruleId: 'r-1', processedGaps: 5, status: 'success' }),
          expect.objectContaining({ ruleId: 'r-2', processedGaps: 5, status: 'success' }),
        ],
      })
    );
  });

  test('should audit and throw when authorization fails', async () => {
    (authorization.ensureAuthorized as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Unauthorized');
    });

    await expect(rulesClient.getGapFillAutoSchedulerLogs({ id: 'gap-1' })).rejects.toThrow(
      'Unauthorized'
    );

    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Unauthorized' }),
      })
    );
  });

  test('should propagate saved objects get error', async () => {
    unsecuredSavedObjectsClient.get.mockImplementationOnce(() => {
      throw new Error('error getting so');
    });
    await expect(rulesClient.getGapFillAutoSchedulerLogs({ id: 'gap-1' })).rejects.toThrow(
      'error getting so'
    );
  });
});
