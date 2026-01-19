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
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { backfillClientMock } from '../../../../backfill_client/backfill_client.mock';
import { ConnectorAdapterRegistry } from '../../../../connector_adapters/connector_adapter_registry';
import type { ConstructorOptions } from '../../../../rules_client';
import { RulesClient } from '../../../../rules_client';

describe('getRuleTypesByQuery', () => {
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

  const filter = { type: 'mock_filter' };

  beforeEach(() => {
    eventLogClient = eventLogClientMock.create();

    unsecuredSavedObjectsClient.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
      per_page: 1,
      page: 1,
      aggregations: {
        ruleTypeIds: {
          buckets: [{ key: 'rule-type-1' }],
        },
      },
    });

    ruleTypeRegistry.getAllTypes.mockReturnValue(['rule-type-1', 'rule-type-2']);

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
    authorization.getFindAuthorizationFilter.mockResolvedValue({
      filter,
      ensureRuleTypeIsAuthorized() {},
    });

    // Set default response for eventLogClient
    eventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue({
      aggregations: {
        unique_rule_ids: {
          buckets: [],
        },
      },
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should return the correct rule types', async () => {
    const result = await rulesClient.getRuleTypesByQuery({ ids: ['rule-1', 'rule-2'] });

    expect(result).toEqual({ ruleTypes: ['rule-type-1'] });
  });

  it('throws 400 if the ids and filter are set', async () => {
    await expect(
      rulesClient.getRuleTypesByQuery({ ids: ['rule-1', 'rule-2'], filter: 'a-filter' })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to find rule types by query: Both 'filter' and 'ids' are supplied. Define either 'ids' or 'filter' properties in method arguments"`
    );
  });

  it('converts the ids as KQL filter correctly', async () => {
    await rulesClient.getRuleTypesByQuery({ ids: ['rule-1', 'rule-2'] });

    expect(unsecuredSavedObjectsClient.find.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "aggs": Object {
          "ruleTypeIds": Object {
            "terms": Object {
              "field": "alert.attributes.alertTypeId",
              "size": 2,
            },
          },
        },
        "filter": Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "alert.id",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "alert:rule-1",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "alert.id",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "alert:rule-2",
                },
              ],
              "function": "is",
              "type": "function",
            },
          ],
          "function": "or",
          "type": "function",
        },
        "page": 1,
        "perPage": 0,
        "type": "alert",
      }
    `);
  });

  it('converts the filter as KQL filter correctly', async () => {
    await rulesClient.getRuleTypesByQuery({ filter: 'a-filter' });

    expect(unsecuredSavedObjectsClient.find.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "aggs": Object {
          "ruleTypeIds": Object {
            "terms": Object {
              "field": "alert.attributes.alertTypeId",
              "size": 2,
            },
          },
        },
        "filter": Object {
          "arguments": Array [
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": null,
            },
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "a-filter",
            },
          ],
          "function": "is",
          "type": "function",
        },
        "page": 1,
        "perPage": 0,
        "type": "alert",
      }
    `);
  });
});
