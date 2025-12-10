/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { IValidatedEventInternalDocInfo } from '@kbn/event-log-plugin/server';
import {
  savedObjectsClientMock,
  savedObjectsRepositoryMock,
} from '@kbn/core-saved-objects-api-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import type { AlertingAuthorization } from '../../../../authorization';
import { alertingAuthorizationMock } from '../../../../authorization/alerting_authorization.mock';
import { ruleTypeRegistryMock } from '../../../../rule_type_registry.mock';
import type { SavedObject } from '@kbn/core/server';
import type { GapAutoFillSchedulerSO } from '../../../../data/gap_auto_fill_scheduler/types/gap_auto_fill_scheduler';
import { GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { RulesClient } from '../../../../rules_client';
import { ReadOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { ConnectorAdapterRegistry } from '../../../../connector_adapters/connector_adapter_registry';
import { GapAutoFillSchedulerAuditAction } from '../../../../rules_client/common/audit_events';
import type { FindGapAutoFillSchedulerLogsParams } from './types';

const kibanaVersion = 'v8.0.0';
const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

const findEventsBySavedObjectIdsMock = jest.fn();
const eventLogClientMock = {
  findEventsBySavedObjectIds: findEventsBySavedObjectIdsMock,
};

const getEventLogClient = jest.fn();

const mockLogs: Partial<IValidatedEventInternalDocInfo>[] = [
  {
    '@timestamp': '2023-01-01T00:00:00.000Z',
    message: 'Gap fill auto scheduler logs',
    kibana: {
      gap_auto_fill: {
        execution: {
          status: 'success',
          results: [
            {
              rule_id: '1',
              processed_gaps: 10,
              status: 'success',
            },
          ],
        },
      },
    },
  },
];

describe('findGapAutoFillSchedulerLogs()', () => {
  let rulesClient: RulesClient;
  const now = new Date().toISOString();

  const schedulerSO: SavedObject<GapAutoFillSchedulerSO> = {
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
      scope: ['internal'],
      ruleTypes: [
        { type: 'test-rule-type1', consumer: 'test-consumer' },
        { type: 'test-rule-type2', consumer: 'test-consumer' },
      ],
      ruleTypeConsumerPairs: ['test-rule-type1:test-consumer', 'test-rule-type2:test-consumer'],
      createdAt: now,
      updatedAt: now,
      createdBy: 'elastic',
      updatedBy: 'elastic',
    },
    references: [],
  };

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
      getEventLogClient,
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

    unsecuredSavedObjectsClient.get.mockResolvedValue(schedulerSO);
    getEventLogClient.mockResolvedValue(eventLogClientMock);
    findEventsBySavedObjectIdsMock.mockResolvedValue({
      data: mockLogs,
      total: 1,
      page: 1,
      per_page: 10,
    });
  });

  test('should successfully get gap fill auto scheduler logs with default sort and no status filter', async () => {
    const result = await rulesClient.findGapAutoFillSchedulerLogs({
      id: 'gap-1',
      page: 1,
      perPage: 10,
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-02T00:00:00.000Z',
      sortField: '@timestamp',
      sortDirection: 'desc',
    });

    // Saved object is retrieved
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledWith(
      GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      'gap-1'
    );

    // Authorization is checked for each rule type
    expect(authorization.ensureAuthorized).toHaveBeenCalledTimes(
      schedulerSO.attributes.ruleTypes!.length
    );
    for (const ruleType of schedulerSO.attributes.ruleTypes ?? []) {
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        ruleTypeId: ruleType.type,
        consumer: ruleType.consumer,
        operation: ReadOperations.FindGapAutoFillSchedulerLogs,
        entity: AlertingAuthorizationEntity.Rule,
      });
    }

    // Event log client is called with correct params
    expect(getEventLogClient).toHaveBeenCalledTimes(1);
    expect(findEventsBySavedObjectIdsMock).toHaveBeenCalledWith('task', ['gap-1'], {
      page: 1,
      per_page: 10,
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-02T00:00:00.000Z',
      sort: [{ sort_field: '@timestamp', sort_order: 'desc' }],
      filter: 'event.action:gap-auto-fill-schedule',
    });

    // Audit log is written for successful GET_LOGS
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: GapAutoFillSchedulerAuditAction.GET_LOGS,
        }),
      })
    );

    // The data is formatted and returned correctly
    expect(result).toEqual({
      data: [
        {
          timestamp: '2023-01-01T00:00:00.000Z',
          status: 'success',
          message: 'Gap fill auto scheduler logs',
          results: [
            {
              ruleId: '1',
              processedGaps: 10,
              status: 'success',
            },
          ],
        },
      ],
      total: 1,
      page: 1,
      perPage: 10,
    });
  });

  test('should include status filters when statuses are provided', async () => {
    await rulesClient.findGapAutoFillSchedulerLogs({
      id: 'gap-1',
      page: 2,
      perPage: 5,
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-02T00:00:00.000Z',
      statuses: ['success', 'error'],
      sortField: '@timestamp',
      sortDirection: 'desc',
    });

    expect(findEventsBySavedObjectIdsMock).toHaveBeenCalledWith('task', ['gap-1'], {
      page: 2,
      per_page: 5,
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-02T00:00:00.000Z',
      sort: [{ sort_field: '@timestamp', sort_order: 'desc' }],
      filter:
        'event.action:gap-auto-fill-schedule AND (kibana.gap_auto_fill.execution.status : success OR kibana.gap_auto_fill.execution.status : error)',
    });
  });

  describe('error handling', () => {
    test('should throw error when getting saved object fails', async () => {
      unsecuredSavedObjectsClient.get.mockImplementationOnce(() => {
        throw new Error('error getting SO!');
      });

      await expect(
        rulesClient.findGapAutoFillSchedulerLogs({
          id: 'gap-1',
          page: 1,
          perPage: 10,
          start: '2023-01-01T00:00:00.000Z',
          end: '2023-01-02T00:00:00.000Z',
          sortField: '@timestamp',
          sortDirection: 'desc',
        })
      ).rejects.toThrowError(/error getting SO!/);
    });

    test('should audit and throw when authorization fails', async () => {
      (authorization.ensureAuthorized as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Unauthorized');
      });

      await expect(
        rulesClient.findGapAutoFillSchedulerLogs({
          id: 'gap-1',
          page: 1,
          perPage: 10,
          start: '2023-01-01T00:00:00.000Z',
          end: '2023-01-02T00:00:00.000Z',
          sortField: '@timestamp',
          sortDirection: 'desc',
        })
      ).rejects.toThrowError(/Failed to get gap fill auto scheduler logs by id: gap-1/);

      // Audit contains the error
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Unauthorized',
          }),
        })
      );
    });

    test('validate params and throw error when invalid', async () => {
      await expect(
        rulesClient.findGapAutoFillSchedulerLogs({
          id: 'gap-1',
          page: 1,
          perPage: 10,
        } as unknown as FindGapAutoFillSchedulerLogsParams)
      ).rejects.toThrowError(/Error validating gap auto fill scheduler logs parameters/);
    });
  });
});
