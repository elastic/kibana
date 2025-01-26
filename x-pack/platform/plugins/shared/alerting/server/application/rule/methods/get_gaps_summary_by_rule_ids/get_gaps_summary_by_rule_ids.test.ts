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
import { fromKueryExpression } from '@kbn/es-query';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { backfillClientMock } from '../../../../backfill_client/backfill_client.mock';
import { ConnectorAdapterRegistry } from '../../../../connector_adapters/connector_adapter_registry';
import { ConstructorOptions, RulesClient } from '../../../../rules_client';

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
const eventLogClient = eventLogClientMock.create();
const eventLogger = eventLoggerMock.create();

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
};

const filter = fromKueryExpression(
  '((alert.attributes.alertTypeId:myType and alert.attributes.consumer:myApp))'
);

describe('getGapsSummaryByRuleIds', () => {
  let rulesClient: RulesClient;

  beforeEach(() => {
    jest.clearAllMocks();
    rulesClient = new RulesClient(rulesClientParams);
    rulesClientParams.getEventLogClient.mockResolvedValue(eventLogClient);
    authorization.getFindAuthorizationFilter.mockResolvedValue({
      filter,
      ensureRuleTypeIsAuthorized() {},
    });
  });

  test('should successfully get gaps summary for rules', async () => {
    const ruleIds = ['1', '2'];
    const start = '2023-11-16T08:00:00.000Z';
    const end = '2023-11-16T09:00:00.000Z';

    unsecuredSavedObjectsClient.find.mockResolvedValue({
      aggregations: {
        alertTypeId: {
          buckets: [{ key: ['myType', 'myApp'], doc_count: 1 }],
        },
      },
      saved_objects: [],
      per_page: 0,
      page: 0,
      total: 1,
    });

    eventLogClient.aggregateEventsBySavedObjectIds.mockResolvedValue({
      aggregations: {
        unique_rule_ids: {
          buckets: [
            {
              key: '1',
              totalUnfilledDurationMs: { value: 1000 },
              totalInProgressDurationMs: { value: 2000 },
              totalFilledDurationMs: { value: 3000 },
            },
            {
              key: '2',
              totalUnfilledDurationMs: { value: 4000 },
              totalInProgressDurationMs: { value: 5000 },
              totalFilledDurationMs: { value: 6000 },
            },
          ],
        },
      },
    });

    const result = await rulesClient.getGapsSummaryByRuleIds({
      ruleIds,
      start,
      end,
    });

    expect(authorization.getFindAuthorizationFilter).toHaveBeenCalledWith({
      authorizationEntity: 'rule',
      filterOpts: {
        fieldNames: {
          consumer: 'alert.attributes.consumer',
          ruleTypeId: 'alert.attributes.alertTypeId',
        },
        type: 'kql',
      },
    });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.any(Object),
        aggs: {
          alertTypeId: {
            multi_terms: {
              terms: [
                { field: 'alert.attributes.alertTypeId' },
                { field: 'alert.attributes.consumer' },
              ],
            },
          },
        },
      })
    );

    expect(eventLogClient.aggregateEventsBySavedObjectIds).toHaveBeenCalledWith('alert', ruleIds, {
      filter: `event.action: gap AND event.provider: alerting AND kibana.alert.rule.gap.range <= "2023-11-16T09:00:00.000Z" AND kibana.alert.rule.gap.range >= "2023-11-16T08:00:00.000Z"`,
      aggs: {
        unique_rule_ids: {
          terms: {
            field: 'rule.id',
            size: 10000,
          },
          aggs: {
            totalUnfilledDurationMs: {
              sum: {
                field: 'kibana.alert.rule.gap.unfilled_duration_ms',
              },
            },
            totalInProgressDurationMs: {
              sum: {
                field: 'kibana.alert.rule.gap.in_progress_duration_ms',
              },
            },
            totalFilledDurationMs: {
              sum: {
                field: 'kibana.alert.rule.gap.filled_duration_ms',
              },
            },
          },
        },
      },
    });

    expect(result).toEqual({
      data: [
        {
          ruleId: '1',
          totalUnfilledDurationMs: 1000,
          totalInProgressDurationMs: 2000,
          totalFilledDurationMs: 3000,
        },
        {
          ruleId: '2',
          totalUnfilledDurationMs: 4000,
          totalInProgressDurationMs: 5000,
          totalFilledDurationMs: 6000,
        },
      ],
    });
  });

  describe('error handling', () => {
    test('should throw error if authorization fails', async () => {
      authorization.getFindAuthorizationFilter.mockRejectedValue(new Error('Not authorized'));

      await expect(
        rulesClient.getGapsSummaryByRuleIds({
          ruleIds: ['1'],
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-16T09:00:00.000Z',
        })
      ).rejects.toThrow('Not authorized');

      expect(auditLogger.log).toHaveBeenCalledWith({
        error: {
          code: 'Error',
          message: 'Not authorized',
        },
        event: {
          action: 'rule_get_gaps_summary_by_rule_ids',
          category: ['database'],
          outcome: 'failure',
          type: ['access'],
        },
        kibana: {
          saved_object: undefined,
        },
        message: 'Failed attempt to get gaps summary by rule ids a rule',
      });
    });

    test('should throw error if no rules found', async () => {
      unsecuredSavedObjectsClient.find.mockResolvedValue({
        aggregations: {
          alertTypeId: {
            buckets: [],
          },
        },
        saved_objects: [],
        per_page: 0,
        page: 0,
        total: 0,
      });

      await expect(
        rulesClient.getGapsSummaryByRuleIds({
          ruleIds: ['1'],
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-16T09:00:00.000Z',
        })
      ).rejects.toThrow('No rules matching ids 1 found to get gaps summary');
    });

    test('should throw error if rule type authorization fails', async () => {
      unsecuredSavedObjectsClient.find.mockResolvedValue({
        aggregations: {
          alertTypeId: {
            buckets: [{ key: ['myType', 'myApp'], doc_count: 1 }],
          },
        },
        saved_objects: [],
        per_page: 0,
        page: 0,
        total: 1,
      });

      authorization.ensureAuthorized.mockRejectedValue(new Error('Not authorized for rule type'));

      await expect(
        rulesClient.getGapsSummaryByRuleIds({
          ruleIds: ['1'],
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-16T09:00:00.000Z',
        })
      ).rejects.toThrow('Not authorized for rule type');

      expect(auditLogger.log).toHaveBeenCalledWith({
        error: {
          code: 'Error',
          message: 'Not authorized for rule type',
        },
        event: {
          action: 'rule_get_gaps_summary_by_rule_ids',
          category: ['database'],
          outcome: 'failure',
          type: ['access'],
        },
        kibana: {
          saved_object: undefined,
        },
        message: 'Failed attempt to get gaps summary by rule ids a rule',
      });
    });
  });
});
