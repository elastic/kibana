/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConstructorOptions } from '../../../../rules_client/rules_client';
import { RulesClient } from '../../../../rules_client/rules_client';
import {
  savedObjectsClientMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ruleTypeRegistryMock } from '../../../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../../../authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import type { AlertingAuthorization } from '../../../../authorization/alerting_authorization';
import type { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { getBeforeSetup, setGlobalDate } from '../../../../rules_client/tests/lib';
import { ConnectorAdapterRegistry } from '../../../../connector_adapters/connector_adapter_registry';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { backfillClientMock } from '../../../../backfill_client/backfill_client.mock';

jest.mock('../../../../rules_client/lib/siem_legacy_actions/format_legacy_actions', () => {
  return {
    formatLegacyActions: jest.fn(),
  };
});

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

const kibanaVersion = 'v7.10.0';
const rulesClientParams: jest.Mocked<ConstructorOptions> = {
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: authorization as unknown as AlertingAuthorization,
  actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
  spaceId: 'default',
  namespace: 'default',
  maxScheduledPerMinute: 10000,
  minimumScheduleInterval: { value: '1m', enforce: false },
  getUserName: jest.fn(),
  createAPIKey: jest.fn(),
  logger: loggingSystemMock.create().get(),
  internalSavedObjectsRepository,
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
  isAuthenticationTypeAPIKey: jest.fn(),
  getAuthenticationAPIKey: jest.fn(),
  connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  getAlertIndicesAlias: jest.fn(),
  alertsService: null,
  backfillClient: backfillClientMock.create(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
  isSystemAction: jest.fn(),
};

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
  (auditLogger.log as jest.Mock).mockClear();
});

setGlobalDate();

describe('get()', () => {
  it('calls saved objects client with given params', async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
      attributes: {
        ruleTypeId: '123',
        name: 'test template',
        description: 'test template',
        tags: ['foo'],
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
      },
      references: [],
    });

    authorization.getAllAuthorizedRuleTypes.mockResolvedValue({
      hasAllRequested: true,
      authorizedRuleTypes: new Map([
        ['123', { authorizedConsumers: { consumer1: { read: true, all: true } } }],
      ]),
    });
    const result = await rulesClient.getTemplate({ id: '1' });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "alertDelay": undefined,
        "artifacts": undefined,
        "description": "test template",
        "flapping": undefined,
        "id": "1",
        "name": "test template",
        "params": Object {
          "bar": true,
        },
        "ruleTypeId": "123",
        "schedule": Object {
          "interval": "10s",
        },
        "tags": Array [
          "foo",
        ],
      }
    `);
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "alerting_rule_template",
        "1",
        undefined,
      ]
    `);
  });

  describe('authorization', () => {
    beforeEach(() => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
        attributes: {
          ruleTypeId: 'myType',
          name: 'test template',
          tags: ['foo'],
          schedule: { interval: '10s' },
          params: {
            bar: true,
          },
        },
        references: [],
      });
    });

    it('ensures user is authorised to get this type of rule template', async () => {
      const rulesClient = new RulesClient(rulesClientParams);
      authorization.getAllAuthorizedRuleTypes.mockResolvedValue({
        hasAllRequested: true,
        authorizedRuleTypes: new Map([
          ['myType', { authorizedConsumers: { consumer1: { read: true, all: true } } }],
        ]),
      });
      await rulesClient.getTemplate({ id: '1' });

      expect(authorization.getAllAuthorizedRuleTypes).toHaveBeenCalledWith({
        authorizationEntity: 'rule',
        operations: ['get'],
      });
    });

    it('throws when user is not authorised to get this type of alert', async () => {
      const rulesClient = new RulesClient(rulesClientParams);
      authorization.getAllAuthorizedRuleTypes.mockResolvedValue({
        hasAllRequested: true,
        authorizedRuleTypes: new Map([
          ['myType', { authorizedConsumers: { consumer1: { read: false, all: false } } }],
        ]),
      });

      await expect(rulesClient.getTemplate({ id: '1' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to get "myType" RuleTemplate]`
      );

      expect(authorization.getAllAuthorizedRuleTypes).toHaveBeenCalledWith({
        authorizationEntity: 'rule',
        operations: ['get'],
      });
    });
  });
});
