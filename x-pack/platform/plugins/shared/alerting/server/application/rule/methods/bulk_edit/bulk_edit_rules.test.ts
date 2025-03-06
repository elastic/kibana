/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { schema } from '@kbn/config-schema';
import { omit } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { RulesClient, ConstructorOptions } from '../../../../rules_client/rules_client';
import {
  savedObjectsClientMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ruleTypeRegistryMock } from '../../../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../../../authorization/alerting_authorization.mock';
import { RecoveredActionGroup, RuleTypeParams } from '../../../../../common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { AlertingAuthorization } from '../../../../authorization/alerting_authorization';
import { ActionsAuthorization, ActionsClient } from '@kbn/actions-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { getBeforeSetup, setGlobalDate } from '../../../../rules_client/tests/lib';
import { bulkMarkApiKeysForInvalidation } from '../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import {
  enabledRule1,
  enabledRule2,
  siemRule1,
  siemRule2,
} from '../../../../rules_client/tests/test_helpers';
import { migrateLegacyActions } from '../../../../rules_client/lib';
import { migrateLegacyActionsMock } from '../../../../rules_client/lib/siem_legacy_actions/retrieve_migrated_legacy_actions.mock';
import { ConnectorAdapterRegistry } from '../../../../connector_adapters/connector_adapter_registry';
import { ConnectorAdapter } from '../../../../connector_adapters/types';
import { SavedObject } from '@kbn/core/server';
import { bulkEditOperationsSchema } from './schemas';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { backfillClientMock } from '../../../../backfill_client/backfill_client.mock';
import { RawRule } from '../../../../types';

jest.mock('../../../../rules_client/lib/siem_legacy_actions/migrate_legacy_actions', () => {
  return {
    migrateLegacyActions: jest.fn(),
  };
});
(migrateLegacyActions as jest.Mock).mockResolvedValue({
  hasLegacyActions: false,
  resultedActions: [],
  resultedReferences: [],
});

jest.mock('../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation', () => ({
  bulkMarkApiKeysForInvalidation: jest.fn(),
}));

jest.mock('../../../../lib/snooze/get_active_snooze_if_exist', () => ({
  getActiveSnoozeIfExist: jest.fn(),
}));

jest.mock('uuid', () => {
  let uuid = 100;
  return { v4: () => `${uuid++}` };
});

jest.mock('../get_schedule_frequency', () => ({
  validateScheduleLimit: jest.fn(),
}));

const { getActiveSnoozeIfExist } = jest.requireMock(
  '../../../../lib/snooze/get_active_snooze_if_exist'
);
const { validateScheduleLimit } = jest.requireMock('../get_schedule_frequency');

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

const kibanaVersion = 'v8.2.0';
const createAPIKeyMock = jest.fn();
const isAuthenticationTypeApiKeyMock = jest.fn();
const getAuthenticationApiKeyMock = jest.fn();

const rulesClientParams: jest.Mocked<ConstructorOptions> = {
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: authorization as unknown as AlertingAuthorization,
  actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
  spaceId: 'default',
  namespace: 'default',
  getUserName: jest.fn(),
  createAPIKey: createAPIKeyMock,
  logger: loggingSystemMock.create().get(),
  internalSavedObjectsRepository,
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
  auditLogger,
  maxScheduledPerMinute: 10000,
  minimumScheduleInterval: { value: '1m', enforce: false },
  isAuthenticationTypeAPIKey: isAuthenticationTypeApiKeyMock,
  getAuthenticationAPIKey: getAuthenticationApiKeyMock,
  connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  isSystemAction: jest.fn(),
  getAlertIndicesAlias: jest.fn(),
  alertsService: null,
  backfillClient: backfillClientMock.create(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
};
const paramsModifier = jest.fn();

const MOCK_API_KEY = Buffer.from('123:abc').toString('base64');

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
  (auditLogger.log as jest.Mock).mockClear();
});

setGlobalDate();

describe('bulkEdit()', () => {
  let rulesClient: RulesClient;
  let actionsClient: jest.Mocked<ActionsClient>;
  const existingRule = {
    id: '1',
    type: RULE_SAVED_OBJECT_TYPE,
    attributes: {
      enabled: false,
      tags: ['foo'],
      createdBy: 'user',
      createdAt: '2019-02-12T21:01:22.479Z',
      updatedAt: '2019-02-12T21:01:22.479Z',
      legacyId: null,
      muteAll: false,
      mutedInstanceIds: [],
      snoozeSchedule: [],
      alertTypeId: 'myType',
      schedule: { interval: '1m' },
      consumer: 'myApp',
      scheduledTaskId: 'task-123',
      executionStatus: {
        lastExecutionDate: '2019-02-12T21:01:22.479Z',
        status: 'pending',
      },
      params: {},
      throttle: null,
      notifyWhen: null,
      actions: [],
      name: 'my rule name',
      revision: 0,
    },
    references: [],
    version: '123',
  };
  const existingDecryptedRule = {
    ...existingRule,
    attributes: {
      ...existingRule.attributes,
      apiKey: MOCK_API_KEY,
      apiKeyCreatedByUser: false,
    },
  };

  const mockCreatePointInTimeFinderAsInternalUser = (
    response = { saved_objects: [existingDecryptedRule] }
  ) => {
    encryptedSavedObjects.createPointInTimeFinderDecryptedAsInternalUser = jest
      .fn()
      .mockResolvedValue({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield response;
        },
      });
  };

  beforeEach(async () => {
    rulesClient = new RulesClient(rulesClientParams);

    actionsClient = (await rulesClientParams.getActionsClient()) as jest.Mocked<ActionsClient>;
    actionsClient.getBulk.mockReset();
    actionsClient.getBulk.mockResolvedValue([
      {
        id: '1',
        actionTypeId: 'test',
        config: {
          from: 'me@me.com',
          hasAuth: false,
          host: 'hello',
          port: 22,
          secure: null,
          service: null,
        },
        isMissingSecrets: false,
        name: 'email connector',
        isPreconfigured: false,
        isSystemAction: false,
        isDeprecated: false,
      },
    ]);
    actionsClient.listTypes.mockReset();
    actionsClient.listTypes.mockResolvedValue([]);
    rulesClientParams.getActionsClient.mockResolvedValue(actionsClient);

    authorization.getFindAuthorizationFilter.mockResolvedValue({
      ensureRuleTypeIsAuthorized() {},
    });

    unsecuredSavedObjectsClient.find.mockResolvedValue({
      aggregations: {
        alertTypeId: {
          buckets: [{ key: ['myType', 'myApp'], key_as_string: 'myType|myApp', doc_count: 1 }],
        },
      },
      saved_objects: [],
      per_page: 0,
      page: 0,
      total: 1,
    });

    mockCreatePointInTimeFinderAsInternalUser({
      saved_objects: [
        {
          ...existingDecryptedRule,
          attributes: { ...existingDecryptedRule.attributes, enabled: true },
        },
      ],
    });

    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: [existingRule],
    });

    ruleTypeRegistry.get.mockReturnValue({
      id: 'myType',
      name: 'Test',
      actionGroups: [
        { id: 'default', name: 'Default' },
        { id: 'custom', name: 'Not the Default' },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      recoveryActionGroup: RecoveredActionGroup,
      async executor() {
        return { state: {} };
      },
      category: 'test',
      validLegacyConsumers: [],
      producer: 'alerts',
      validate: {
        params: { validate: (params) => params },
      },
    });

    (migrateLegacyActions as jest.Mock).mockResolvedValue(migrateLegacyActionsMock);

    rulesClientParams.isSystemAction.mockImplementation((id: string) => id === 'system_action-id');
    actionsClient.isSystemAction.mockImplementation((id: string) => id === 'system_action-id');
  });

  describe('tags operations', () => {
    beforeEach(() => {
      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          {
            ...existingDecryptedRule,
            attributes: { ...existingDecryptedRule.attributes, tags: ['foo'] },
          },
        ],
      });
    });

    test('should add new tag', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {
              enabled: true,
              tags: ['foo', 'test-1'],
              alertTypeId: 'myType',
              schedule: { interval: '1m' },
              consumer: 'myApp',
              scheduledTaskId: 'task-123',
              executionStatus: {
                lastExecutionDate: '2019-02-12T21:01:22.479Z',
                status: 'pending',
              },
              params: {},
              throttle: null,
              notifyWhen: null,
              actions: [],
              revision: 0,
            },
            references: [],
            version: '123',
          },
        ],
      });

      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
      });

      expect(result.total).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0]).toHaveProperty('tags', ['foo', 'test-1']);

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: expect.objectContaining({
              tags: ['foo', 'test-1'],
              revision: 1,
            }),
          }),
        ],
        { overwrite: true }
      );
    });

    test('should delete tag', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {
              enabled: true,
              tags: [],
              alertTypeId: 'myType',
              schedule: { interval: '1m' },
              consumer: 'myApp',
              scheduledTaskId: 'task-123',
              executionStatus: {
                lastExecutionDate: '2019-02-12T21:01:22.479Z',
                status: 'pending',
              },
              params: {},
              throttle: null,
              notifyWhen: null,
              actions: [],
              revision: 0,
            },
            references: [],
            version: '123',
          },
        ],
      });
      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'tags',
            operation: 'delete',
            value: ['foo'],
          },
        ],
      });

      expect(result.rules[0]).toHaveProperty('tags', []);

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: expect.objectContaining({
              tags: [],
              revision: 1,
            }),
          }),
        ],
        { overwrite: true }
      );
    });

    test('should set tags', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {
              enabled: true,
              tags: ['test-1', 'test-2'],
              alertTypeId: 'myType',
              schedule: { interval: '1m' },
              consumer: 'myApp',
              scheduledTaskId: 'task-123',
              executionStatus: {
                lastExecutionDate: '2019-02-12T21:01:22.479Z',
                status: 'pending',
              },
              params: {},
              throttle: null,
              notifyWhen: null,
              actions: [],
              revision: 0,
            },
            references: [],
            version: '123',
          },
        ],
      });

      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'tags',
            operation: 'set',
            value: ['test-1', 'test-2'],
          },
        ],
      });

      expect(result.rules[0]).toHaveProperty('tags', ['test-1', 'test-2']);

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: expect.objectContaining({
              tags: ['test-1', 'test-2'],
              revision: 1,
            }),
          }),
        ],
        { overwrite: true }
      );
    });

    test('should skip operation when adding already existing tags', async () => {
      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['foo'],
          },
        ],
      });

      expect(result.total).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(result.rules).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0]).toHaveProperty('id', existingRule.id);
      expect(result.skipped[0]).toHaveProperty('skip_reason', 'RULE_NOT_MODIFIED');

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(0);
      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(0);
    });

    test('should skip operation when adding no tags', async () => {
      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: [],
          },
        ],
      });

      expect(result.total).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(result.rules).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0]).toHaveProperty('id', existingRule.id);
      expect(result.skipped[0]).toHaveProperty('skip_reason', 'RULE_NOT_MODIFIED');

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(0);
      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(0);
    });

    test('should skip operation when deleting non existing tags', async () => {
      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'tags',
            operation: 'delete',
            value: ['bar'],
          },
        ],
      });

      expect(result.total).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(result.rules).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0]).toHaveProperty('id', existingRule.id);
      expect(result.skipped[0]).toHaveProperty('skip_reason', 'RULE_NOT_MODIFIED');

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(0);
      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(0);
    });

    test('should skip operation when deleting no tags', async () => {
      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'tags',
            operation: 'delete',
            value: [],
          },
        ],
      });

      expect(result.total).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(result.rules).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0]).toHaveProperty('id', existingRule.id);
      expect(result.skipped[0]).toHaveProperty('skip_reason', 'RULE_NOT_MODIFIED');

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(0);
      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(0);
    });
  });

  describe('actions operations', () => {
    const connectorAdapter: ConnectorAdapter = {
      connectorTypeId: '.test',
      ruleActionParamsSchema: schema.object({ foo: schema.string() }),
      buildActionParams: jest.fn(),
    };

    rulesClientParams.connectorAdapterRegistry.register(connectorAdapter);

    beforeEach(() => {
      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [existingDecryptedRule],
      });
    });

    test('should add uuid to new actions', async () => {
      const existingAction = {
        frequency: {
          notifyWhen: 'onActiveAlert' as const,
          summary: false,
          throttle: null,
        },
        group: 'default',
        id: '1',
        params: {},
        uuid: '111',
      };

      const newAction = {
        frequency: {
          notifyWhen: 'onActiveAlert' as const,
          summary: false,
          throttle: null,
        },
        group: 'default',
        id: '2',
        params: {},
      };

      const newAction2 = {
        frequency: {
          notifyWhen: 'onActiveAlert' as const,
          summary: false,
          throttle: null,
        },
        group: 'default',
        id: '3',
        params: {},
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            ...existingRule,
            attributes: {
              ...existingRule.attributes,
              actions: [
                {
                  ...existingAction,
                  actionRef: 'action_0',
                  actionTypeId: 'test-0',
                },
                {
                  ...newAction,
                  actionRef: 'action_1',
                  actionTypeId: 'test-1',
                  uuid: '222',
                },
              ],
            },
            references: [
              {
                name: 'action_0',
                type: 'action',
                id: '1',
              },
              {
                name: 'action_1',
                type: 'action',
                id: '2',
              },
            ],
          },
        ],
      });

      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'actions',
            operation: 'add',
            value: [existingAction, newAction, newAction2],
          },
        ],
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          {
            ...existingRule,
            attributes: {
              ...existingRule.attributes,
              actions: [
                {
                  actionRef: 'action_0',
                  actionTypeId: 'test',
                  frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
                  group: 'default',
                  params: {},
                  uuid: '111',
                },
                {
                  actionRef: '',
                  actionTypeId: '',
                  frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
                  group: 'default',
                  params: {},
                  uuid: '100',
                },
                {
                  actionRef: '',
                  actionTypeId: '',
                  frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
                  group: 'default',
                  params: {},
                  uuid: '101',
                },
              ],
              apiKey: null,
              apiKeyOwner: null,
              apiKeyCreatedByUser: null,
              meta: { versionApiKeyLastmodified: 'v8.2.0' },
              name: 'my rule name',
              enabled: false,
              updatedAt: '2019-02-12T21:01:22.479Z',
              updatedBy: 'elastic',
              tags: ['foo'],
              revision: 1,
            },
            references: [{ id: '1', name: 'action_0', type: 'action' }],
          },
        ],
        { overwrite: true }
      );

      expect(result.rules[0]).toEqual({
        ...omit(existingRule.attributes, 'legacyId'),
        createdAt: new Date(existingRule.attributes.createdAt),
        updatedAt: new Date(existingRule.attributes.updatedAt),
        executionStatus: {
          ...existingRule.attributes.executionStatus,
          lastExecutionDate: new Date(existingRule.attributes.executionStatus.lastExecutionDate),
        },
        actions: [
          { ...existingAction, actionTypeId: 'test-0' },
          { ...newAction, uuid: '222', actionTypeId: 'test-1' },
        ],
        systemActions: [],
        id: existingRule.id,
        snoozeSchedule: [],
      });
    });

    test('should only increment revision once for multiple operations', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            ...existingRule,
            attributes: {
              ...existingRule.attributes,
              revision: 1,
            },
          },
        ],
      });
      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'actions',
            operation: 'add',
            value: [
              {
                id: '687300e0-b882-11ed-ad70-c74a8cf8f386',
                group: 'default',
                params: {
                  message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
                },
              },
            ],
          },
          {
            field: 'throttle',
            operation: 'set',
            value: null,
          },
          {
            field: 'notifyWhen',
            operation: 'set',
            value: 'onActiveAlert',
          },
        ],
      });

      expect(result.rules[0]).toHaveProperty('revision', 1);
    });

    test("should set timeframe in alertsFilter null if doesn't exist", async () => {
      ruleTypeRegistry.get.mockReturnValue({
        id: 'myType',
        name: 'Test',
        actionGroups: [
          { id: 'default', name: 'Default' },
          { id: 'custom', name: 'Not the Default' },
        ],
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        recoveryActionGroup: RecoveredActionGroup,
        async executor() {
          return { state: {} };
        },
        producer: 'alerts',
        validate: {
          params: { validate: (params) => params },
        },
        alerts: {
          context: 'test',
          mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
          shouldWrite: true,
        },
        category: 'test',
        validLegacyConsumers: [],
      });

      const existingAction = {
        frequency: {
          notifyWhen: 'onActiveAlert' as const,
          summary: false,
          throttle: null,
        },
        group: 'default',
        id: '1',
        params: {},
        uuid: '111',
        alertsFilter: {
          query: {
            kql: 'name:test',
            dsl: '{"bool":{"must":[],"filter":[{"bool":{"should":[{"match":{"name":"test"}}],"minimum_should_match":1}}],"should":[],"must_not":[]}}',
            filters: [],
          },
          timeframe: {
            days: [1],
            hours: { start: '08:00', end: '17:00' },
            timezone: 'UTC',
          },
        },
      };
      const newAction = {
        frequency: {
          notifyWhen: 'onActiveAlert' as const,
          summary: false,
          throttle: null,
        },
        group: 'default',
        id: '2',
        params: {},
        uuid: '222',
        alertsFilter: { query: { kql: 'test:1', dsl: 'test', filters: [] } },
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            ...existingRule,
            attributes: {
              ...existingRule.attributes,
              actions: [
                {
                  ...existingAction,
                  actionRef: 'action_0',
                },
                {
                  ...newAction,
                  actionRef: 'action_1',
                  uuid: '222',
                  alertsFilter: {
                    query: { kql: 'test:1', dsl: 'test', filters: [] },
                  },
                },
              ],
            },
            references: [
              {
                name: 'action_0',
                type: 'action',
                id: '1',
              },
              {
                name: 'action_1',
                type: 'action',
                id: '2',
              },
            ],
          },
        ],
      });

      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'actions',
            operation: 'add',
            value: [existingAction, newAction],
          },
        ],
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          {
            ...existingRule,
            attributes: {
              ...existingRule.attributes,
              actions: [
                {
                  actionRef: 'action_0',
                  actionTypeId: 'test',
                  frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
                  group: 'default',
                  params: {},
                  uuid: '111',
                  alertsFilter: existingAction.alertsFilter,
                },
                {
                  actionRef: '',
                  actionTypeId: '',
                  frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
                  group: 'default',
                  params: {},
                  uuid: '222',
                  alertsFilter: {
                    query: {
                      dsl: '{"bool":{"must":[],"filter":[{"bool":{"should":[{"match":{"test":"1"}}],"minimum_should_match":1}}],"should":[],"must_not":[]}}',
                      kql: 'test:1',
                      filters: [],
                    },
                  },
                },
              ],
              apiKey: null,
              apiKeyOwner: null,
              apiKeyCreatedByUser: null,
              meta: { versionApiKeyLastmodified: 'v8.2.0' },
              name: 'my rule name',
              enabled: false,
              updatedAt: '2019-02-12T21:01:22.479Z',
              updatedBy: 'elastic',
              tags: ['foo'],
              revision: 1,
            },
            references: [{ id: '1', name: 'action_0', type: 'action' }],
          },
        ],
        { overwrite: true }
      );
      expect(result.rules[0]).toEqual({
        ...omit(existingRule.attributes, 'legacyId'),
        createdAt: new Date(existingRule.attributes.createdAt),
        updatedAt: new Date(existingRule.attributes.updatedAt),
        executionStatus: {
          ...existingRule.attributes.executionStatus,
          lastExecutionDate: new Date(existingRule.attributes.executionStatus.lastExecutionDate),
        },
        actions: [
          existingAction,
          {
            ...newAction,
            alertsFilter: {
              query: {
                dsl: 'test',
                kql: 'test:1',
                filters: [],
              },
            },
          },
        ],
        id: existingRule.id,
        snoozeSchedule: [],
        systemActions: [],
      });
    });

    test('should add system and default actions', async () => {
      const defaultAction = {
        frequency: {
          notifyWhen: 'onActiveAlert' as const,
          summary: false,
          throttle: null,
        },
        group: 'default',
        id: '1',
        params: {},
      };

      const systemAction = {
        id: 'system_action-id',
        params: {},
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            ...existingRule,
            attributes: {
              ...existingRule.attributes,
              actions: [
                {
                  frequency: {
                    notifyWhen: 'onActiveAlert' as const,
                    summary: false,
                    throttle: null,
                  },
                  group: 'default',
                  params: {},
                  actionRef: 'action_0',
                  actionTypeId: 'test-1',
                  uuid: '222',
                },
                {
                  params: {},
                  actionRef: 'system_action:system_action-id',
                  actionTypeId: 'test-2',
                  uuid: '222',
                },
              ],
            },
            references: [
              {
                name: 'action_0',
                type: 'action',
                id: '1',
              },
            ],
          },
        ],
      });

      actionsClient.getBulk.mockResolvedValue([
        {
          id: '1',
          actionTypeId: 'test-1',
          config: {},
          isMissingSecrets: false,
          name: 'test default connector',
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: false,
        },
        {
          id: 'system_action-id',
          actionTypeId: 'test-2',
          config: {},
          isMissingSecrets: false,
          name: 'system action connector',
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: true,
        },
      ]);

      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'actions',
            operation: 'add',
            value: [defaultAction, systemAction],
          },
        ],
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          {
            ...existingRule,
            attributes: {
              ...existingRule.attributes,
              actions: [
                {
                  actionRef: 'action_0',
                  actionTypeId: 'test-1',
                  frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
                  group: 'default',
                  params: {},
                  uuid: '103',
                },
                {
                  actionRef: 'system_action:system_action-id',
                  actionTypeId: 'test-2',
                  params: {},
                  uuid: '104',
                },
              ],
              apiKey: null,
              apiKeyOwner: null,
              apiKeyCreatedByUser: null,
              meta: { versionApiKeyLastmodified: 'v8.2.0' },
              name: 'my rule name',
              enabled: false,
              updatedAt: '2019-02-12T21:01:22.479Z',
              updatedBy: 'elastic',
              tags: ['foo'],
              revision: 1,
            },
            references: [{ id: '1', name: 'action_0', type: 'action' }],
          },
        ],
        { overwrite: true }
      );

      expect(result.rules[0]).toEqual({
        ...omit(existingRule.attributes, 'legacyId'),
        createdAt: new Date(existingRule.attributes.createdAt),
        updatedAt: new Date(existingRule.attributes.updatedAt),
        executionStatus: {
          ...existingRule.attributes.executionStatus,
          lastExecutionDate: new Date(existingRule.attributes.executionStatus.lastExecutionDate),
        },
        actions: [{ ...defaultAction, actionTypeId: 'test-1', uuid: '222' }],
        systemActions: [{ ...systemAction, actionTypeId: 'test-2', uuid: '222' }],
        id: existingRule.id,
        snoozeSchedule: [],
      });
    });

    test('should construct the refs correctly and persist the actions correctly', async () => {
      const defaultAction = {
        frequency: {
          notifyWhen: 'onActiveAlert' as const,
          summary: false,
          throttle: null,
        },
        group: 'default',
        id: '1',
        params: {},
      };

      const systemAction = {
        id: 'system_action-id',
        params: {},
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            ...existingRule,
            attributes: {
              ...existingRule.attributes,
              actions: [
                {
                  frequency: {
                    notifyWhen: 'onActiveAlert' as const,
                    summary: false,
                    throttle: null,
                  },
                  group: 'default',
                  params: {},
                  actionRef: 'action_0',
                  actionTypeId: 'test-1',
                  uuid: '222',
                },
                {
                  params: {},
                  actionRef: 'system_action:system_action-id',
                  actionTypeId: 'test-2',
                  uuid: '222',
                },
              ],
            },
            references: [
              {
                name: 'action_0',
                type: 'action',
                id: '1',
              },
            ],
          },
        ],
      });

      actionsClient.getBulk.mockResolvedValue([
        {
          id: '1',
          actionTypeId: 'test-1',
          config: {},
          isMissingSecrets: false,
          name: 'test default connector',
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: false,
        },
        {
          id: 'system_action-id',
          actionTypeId: 'test-2',
          config: {},
          isMissingSecrets: false,
          name: 'system action connector',
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: true,
        },
      ]);

      await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'actions',
            operation: 'add',
            value: [defaultAction, systemAction],
          },
        ],
      });

      const rule = unsecuredSavedObjectsClient.bulkCreate.mock.calls[0][0] as Array<
        SavedObject<RawRule>
      >;

      expect(rule[0].attributes.actions).toEqual([
        {
          actionRef: 'action_0',
          actionTypeId: 'test-1',
          frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
          group: 'default',
          params: {},
          uuid: '105',
        },
        {
          actionRef: 'system_action:system_action-id',
          actionTypeId: 'test-2',
          params: {},
          uuid: '106',
        },
      ]);
    });

    test('should transforms the actions correctly', async () => {
      const defaultAction = {
        frequency: {
          notifyWhen: 'onActiveAlert' as const,
          summary: false,
          throttle: null,
        },
        group: 'default',
        id: '1',
        params: {},
      };

      const systemAction = {
        id: 'system_action-id',
        params: {},
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            ...existingRule,
            attributes: {
              ...existingRule.attributes,
              actions: [
                {
                  frequency: {
                    notifyWhen: 'onActiveAlert' as const,
                    summary: false,
                    throttle: null,
                  },
                  group: 'default',
                  params: {},
                  actionRef: 'action_0',
                  actionTypeId: 'test-1',
                  uuid: '222',
                },
                {
                  params: {},
                  actionRef: 'system_action:system_action-id',
                  actionTypeId: 'test-2',
                  uuid: '222',
                },
              ],
            },
            references: [
              {
                name: 'action_0',
                type: 'action',
                id: '1',
              },
            ],
          },
        ],
      });

      actionsClient.getBulk.mockResolvedValue([
        {
          id: '1',
          actionTypeId: 'test-1',
          config: {},
          isMissingSecrets: false,
          name: 'test default connector',
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: false,
        },
        {
          id: 'system_action-id',
          actionTypeId: 'test-2',
          config: {},
          isMissingSecrets: false,
          name: 'system action connector',
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: true,
        },
      ]);

      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'actions',
            operation: 'add',
            value: [defaultAction, systemAction],
          },
        ],
      });

      expect(result.rules[0].actions).toEqual([
        { ...defaultAction, actionTypeId: 'test-1', uuid: '222' },
      ]);
      expect(result.rules[0].systemActions).toEqual([
        { ...systemAction, actionTypeId: 'test-2', uuid: '222' },
      ]);
    });

    it('should return an error if the action does not have the right attributes', async () => {
      const action = {
        id: 'system_action-id',
        uuid: '123',
        params: {},
      };

      actionsClient.isSystemAction.mockReturnValue(false);
      actionsClient.getBulk.mockResolvedValue([
        {
          id: 'system_action-id',
          actionTypeId: 'test-2',
          config: {},
          isMissingSecrets: false,
          name: 'system action connector',
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: true,
        },
      ]);

      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'actions',
            operation: 'add',
            value: [action],
          },
        ],
      });

      expect(result).toMatchInlineSnapshot(`
        Object {
          "errors": Array [
            Object {
              "message": "Error validating bulk edit rules operations - [group]: expected value of type [string] but got [undefined]",
              "rule": Object {
                "id": "1",
                "name": "my rule name",
              },
            },
          ],
          "rules": Array [],
          "skipped": Array [],
          "total": 1,
        }
      `);
    });

    it('should throw an error if the system action contains the group', async () => {
      const action = {
        id: 'system_action-id',
        uuid: '123',
        params: {},
        group: 'default',
      };

      actionsClient.isSystemAction.mockReturnValue(true);
      actionsClient.getBulk.mockResolvedValue([
        {
          id: 'system_action-id',
          actionTypeId: 'test-2',
          config: {},
          isMissingSecrets: false,
          name: 'system action connector',
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: true,
        },
      ]);

      const res = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'actions',
            operation: 'add',
            value: [action],
          },
        ],
      });

      expect(res).toEqual({
        errors: [
          {
            message:
              'Error validating bulk edit rules operations - [group]: definition for this key is missing',
            rule: {
              id: '1',
              name: 'my rule name',
            },
          },
        ],
        rules: [],
        skipped: [],
        total: 1,
      });
    });

    it('should throw an error if the system action contains the frequency', async () => {
      const action = {
        id: 'system_action-id',
        uuid: '123',
        params: {},
        frequency: {
          notifyWhen: 'onActiveAlert' as const,
          summary: false,
          throttle: null,
        },
      };

      actionsClient.isSystemAction.mockReturnValue(true);
      actionsClient.getBulk.mockResolvedValue([
        {
          id: 'system_action-id',
          actionTypeId: 'test-2',
          config: {},
          isMissingSecrets: false,
          name: 'system action connector',
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: true,
        },
      ]);

      const res = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'actions',
            operation: 'add',
            value: [action],
          },
        ],
      });

      expect(res).toEqual({
        errors: [
          {
            message:
              'Error validating bulk edit rules operations - [frequency]: definition for this key is missing',
            rule: {
              id: '1',
              name: 'my rule name',
            },
          },
        ],
        rules: [],
        skipped: [],
        total: 1,
      });
    });

    it('should throw an error if the system action contains the alertsFilter', async () => {
      const action = {
        id: 'system_action-id',
        uuid: '123',
        params: {},
        alertsFilter: {
          query: { kql: 'test:1', filters: [] },
        },
      };

      actionsClient.isSystemAction.mockReturnValue(true);
      actionsClient.getBulk.mockResolvedValue([
        {
          id: 'system_action-id',
          actionTypeId: 'test-2',
          config: {},
          isMissingSecrets: false,
          name: 'system action connector',
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: true,
        },
      ]);

      const res = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'actions',
            operation: 'add',
            value: [action],
          },
        ],
      });

      expect(res).toEqual({
        errors: [
          {
            message:
              'Error validating bulk edit rules operations - [alertsFilter]: definition for this key is missing',
            rule: {
              id: '1',
              name: 'my rule name',
            },
          },
        ],
        rules: [],
        skipped: [],
        total: 1,
      });
    });

    it('should throw an error if the same system action is used twice', async () => {
      const action = {
        id: 'system_action-id',
        uuid: '123',
        params: {},
      };

      actionsClient.isSystemAction.mockReturnValue(true);
      actionsClient.getBulk.mockResolvedValue([
        {
          id: 'system_action-id',
          actionTypeId: 'test-2',
          config: {},
          isMissingSecrets: false,
          name: 'system action connector',
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: true,
        },
      ]);

      const res = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'actions',
            operation: 'add',
            value: [action, action],
          },
        ],
      });

      expect(res).toEqual({
        errors: [
          {
            message: 'Cannot use the same system action twice',
            rule: {
              id: '1',
              name: 'my rule name',
            },
          },
        ],
        rules: [],
        skipped: [],
        total: 1,
      });
    });

    it('should throw an error if the default action does not contain the group', async () => {
      const action = {
        id: '1',
        params: {},
      };

      actionsClient.isSystemAction.mockReturnValue(false);

      await expect(
        rulesClient.bulkEdit({
          filter: '',
          operations: [
            {
              field: 'actions',
              operation: 'add',
              value: [action],
            },
          ],
        })
      ).resolves.toMatchInlineSnapshot(`
        Object {
          "errors": Array [
            Object {
              "message": "Error validating bulk edit rules operations - [group]: expected value of type [string] but got [undefined]",
              "rule": Object {
                "id": "1",
                "name": "my rule name",
              },
            },
          ],
          "rules": Array [],
          "skipped": Array [],
          "total": 1,
        }
      `);
    });

    test('should throw an error if the user does not have privileges to execute the action', async () => {
      const defaultAction = {
        frequency: {
          notifyWhen: 'onActiveAlert' as const,
          summary: false,
          throttle: null,
        },
        group: 'default',
        id: '1',
        params: {},
      };

      const systemAction = {
        id: 'system_action-id',
        params: {},
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            ...existingRule,
            attributes: {
              ...existingRule.attributes,
              actions: [
                {
                  frequency: {
                    notifyWhen: 'onActiveAlert' as const,
                    summary: false,
                    throttle: null,
                  },
                  group: 'default',
                  params: {},
                  actionRef: 'action_0',
                  actionTypeId: 'test-1',
                  uuid: '222',
                },
                {
                  params: {},
                  actionRef: 'system_action:system_action-id',
                  actionTypeId: 'test-2',
                  uuid: '222',
                },
              ],
            },
            references: [
              {
                name: 'action_0',
                type: 'action',
                id: '1',
              },
            ],
          },
        ],
      });

      actionsClient.getBulk.mockResolvedValue([
        {
          id: '1',
          actionTypeId: 'test-1',
          config: {},
          isMissingSecrets: false,
          name: 'test default connector',
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: false,
        },
        {
          id: 'system_action-id',
          actionTypeId: 'test-2',
          config: {},
          isMissingSecrets: false,
          name: 'system action connector',
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: true,
        },
      ]);

      actionsAuthorization.ensureAuthorized.mockRejectedValueOnce(
        new Error('Unauthorized to execute actions')
      );

      const res = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'actions',
            operation: 'add',
            value: [defaultAction, systemAction],
          },
        ],
      });

      expect(res.rules.length).toBe(0);
      expect(res.skipped.length).toBe(0);
      expect(res.total).toBe(1);

      expect(res.errors).toEqual([
        {
          message: 'Unauthorized to execute actions',
          rule: {
            id: '1',
            name: 'my rule name',
          },
        },
      ]);
    });
  });

  describe('index pattern operations', () => {
    beforeEach(() => {
      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          {
            ...existingDecryptedRule,
            attributes: {
              ...existingDecryptedRule.attributes,
              params: { index: ['index-1', 'index-2'] },
            },
          },
        ],
      });
    });

    test('should add index patterns', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {
              enabled: true,
              tags: ['foo'],
              alertTypeId: 'myType',
              schedule: { interval: '1m' },
              consumer: 'myApp',
              scheduledTaskId: 'task-123',
              executionStatus: {
                lastExecutionDate: '2019-02-12T21:01:22.479Z',
                status: 'pending',
              },
              params: {
                index: ['test-1', 'test-2', 'test-4', 'test-5'],
              },
              throttle: null,
              notifyWhen: null,
              actions: [],
              revision: 0,
            },
            references: [],
            version: '123',
          },
        ],
      });

      paramsModifier.mockResolvedValue({
        modifiedParams: {
          index: ['test-1', 'test-2', 'test-4', 'test-5'],
        },
        isParamsUpdateSkipped: false,
      });

      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-tag'],
          },
        ],
        paramsModifier,
      });

      expect(result.rules[0].params).toHaveProperty('index', [
        'test-1',
        'test-2',
        'test-4',
        'test-5',
      ]);

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: expect.objectContaining({
              params: expect.objectContaining({
                index: ['test-1', 'test-2', 'test-4', 'test-5'],
              }),
              revision: 1,
            }),
          }),
        ],
        { overwrite: true }
      );
    });

    test('should delete index patterns', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {
              enabled: true,
              tags: ['foo'],
              alertTypeId: 'myType',
              schedule: { interval: '1m' },
              consumer: 'myApp',
              scheduledTaskId: 'task-123',
              executionStatus: {
                lastExecutionDate: '2019-02-12T21:01:22.479Z',
                status: 'pending',
              },
              params: {
                index: ['test-1'],
              },
              throttle: null,
              notifyWhen: null,
              actions: [],
              revision: 0,
            },
            references: [],
            version: '123',
          },
        ],
      });

      paramsModifier.mockResolvedValue({
        modifiedParams: {
          index: ['test-1'],
        },
        isParamsUpdateSkipped: false,
      });

      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-tag'],
          },
        ],
        paramsModifier,
      });

      expect(result.rules[0].params).toHaveProperty('index', ['test-1']);

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: expect.objectContaining({
              params: expect.objectContaining({
                index: ['test-1'],
              }),
              revision: 1,
            }),
          }),
        ],
        { overwrite: true }
      );
    });

    test('should skip operation when params modifiers does not modify index pattern array', async () => {
      const originalValidate = bulkEditOperationsSchema.validate;
      bulkEditOperationsSchema.validate = jest.fn();

      paramsModifier.mockResolvedValue({
        modifiedParams: {
          index: ['test-1', 'test-2'],
        },
        isParamsUpdateSkipped: true,
      });

      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [],
        paramsModifier,
      });

      expect(result.rules).toHaveLength(0);
      expect(result.skipped[0].id).toBe(existingRule.id);

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(0);
      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(0);

      bulkEditOperationsSchema.validate = originalValidate;
    });
  });

  describe('snoozeSchedule operations', () => {
    afterEach(() => {
      getActiveSnoozeIfExist.mockImplementation(() => false);
    });

    const getSnoozeSchedule = (useId: boolean = true) => {
      return {
        ...(useId && { id: uuidv4() }),
        duration: 28800000,
        rRule: {
          dtstart: '2010-09-19T11:49:59.329Z',
          count: 1,
          tzid: 'UTC',
        },
      };
    };

    const getMockAttribute = (override: Record<string, any> = {}) => {
      return {
        saved_objects: [
          {
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {
              enabled: true,
              tags: ['foo', 'test-1'],
              alertTypeId: 'myType',
              schedule: { interval: '1m' },
              consumer: 'myApp',
              scheduledTaskId: 'task-123',
              executionStatus: {
                lastExecutionDate: '2019-02-12T21:01:22.479Z',
                status: 'pending',
              },
              params: {},
              throttle: null,
              notifyWhen: null,
              actions: [],
              snoozeSchedule: [],
              ...override,
            },
            references: [],
            version: '123',
          },
        ],
      };
    };

    test('should snooze', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(getMockAttribute());
      const snoozePayload = getSnoozeSchedule(false);
      await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            operation: 'set',
            field: 'snoozeSchedule',
            value: snoozePayload,
          },
        ],
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: expect.objectContaining({
              snoozeSchedule: [snoozePayload],
              revision: 0,
            }),
          }),
        ],
        { overwrite: true }
      );
    });

    test('should add snooze schedule', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(getMockAttribute());

      const snoozePayload = getSnoozeSchedule();
      await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            operation: 'set',
            field: 'snoozeSchedule',
            value: snoozePayload,
          },
        ],
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: expect.objectContaining({
              revision: 0,
              snoozeSchedule: [snoozePayload],
            }),
          }),
        ],
        { overwrite: true }
      );
    });

    test('should not unsnooze a snoozed rule when bulk adding snooze schedules', async () => {
      const existingSnooze = [getSnoozeSchedule(false), getSnoozeSchedule()];

      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          {
            ...existingDecryptedRule,
            attributes: {
              ...existingDecryptedRule.attributes,
              snoozeSchedule: existingSnooze,
            } as any,
          },
        ],
      });

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(getMockAttribute());

      const snoozePayload = getSnoozeSchedule();
      await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            operation: 'set',
            field: 'snoozeSchedule',
            value: snoozePayload,
          },
        ],
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: expect.objectContaining({
              revision: 0,
              snoozeSchedule: [...existingSnooze, snoozePayload],
            }),
          }),
        ],
        { overwrite: true }
      );
    });

    test('should not unsnooze an indefinitely snoozed rule when bulk adding snooze schedules', async () => {
      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          {
            ...existingDecryptedRule,
            attributes: {
              ...existingDecryptedRule.attributes,
              muteAll: true,
              snoozeSchedule: [],
            } as any,
          },
        ],
      });

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(getMockAttribute());

      const snoozePayload = getSnoozeSchedule();
      await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            operation: 'set',
            field: 'snoozeSchedule',
            value: snoozePayload,
          },
        ],
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: expect.objectContaining({
              muteAll: true,
              revision: 0,
              snoozeSchedule: [snoozePayload],
            }),
          }),
        ],
        { overwrite: true }
      );
    });

    test('should unsnooze', async () => {
      const existingSnooze = [getSnoozeSchedule(false), getSnoozeSchedule(), getSnoozeSchedule()];

      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          {
            ...existingDecryptedRule,
            attributes: {
              ...existingDecryptedRule.attributes,
              snoozeSchedule: existingSnooze,
            } as any,
          },
        ],
      });

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(getMockAttribute());

      await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            operation: 'delete',
            field: 'snoozeSchedule',
          },
        ],
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: expect.objectContaining({
              revision: 0,
              snoozeSchedule: [existingSnooze[1], existingSnooze[2]],
            }),
          }),
        ],
        { overwrite: true }
      );
    });

    test('should remove snooze schedules', async () => {
      const existingSnooze = [getSnoozeSchedule(), getSnoozeSchedule()];

      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          {
            ...existingDecryptedRule,
            attributes: {
              ...existingDecryptedRule.attributes,
              snoozeSchedule: existingSnooze,
            } as any,
          },
        ],
      });

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(getMockAttribute());

      await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            operation: 'delete',
            field: 'snoozeSchedule',
            value: [],
          },
        ],
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: expect.objectContaining({
              revision: 0,
              snoozeSchedule: [],
            }),
          }),
        ],
        { overwrite: true }
      );
    });

    test('should not unsnooze rule when removing snooze schedules', async () => {
      const existingSnooze = [getSnoozeSchedule(false), getSnoozeSchedule(), getSnoozeSchedule()];

      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          {
            ...existingDecryptedRule,
            attributes: {
              ...existingDecryptedRule.attributes,
              snoozeSchedule: existingSnooze,
            } as any,
          },
        ],
      });

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(getMockAttribute());

      await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            operation: 'delete',
            field: 'snoozeSchedule',
            value: [],
          },
        ],
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: expect.objectContaining({
              revision: 0,
              snoozeSchedule: [existingSnooze[0]],
            }),
          }),
        ],
        { overwrite: true }
      );
    });

    test('should error if adding snooze schedule to rule with 5 schedules', async () => {
      const existingSnooze = [
        getSnoozeSchedule(),
        getSnoozeSchedule(),
        getSnoozeSchedule(),
        getSnoozeSchedule(),
        getSnoozeSchedule(),
      ];

      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          {
            ...existingDecryptedRule,
            attributes: {
              ...existingDecryptedRule.attributes,
              snoozeSchedule: existingSnooze,
            } as any,
          },
        ],
      });

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue(getMockAttribute());

      const snoozePayload = getSnoozeSchedule();

      const response = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            operation: 'set',
            field: 'snoozeSchedule',
            value: snoozePayload,
          },
        ],
      });
      expect(response.errors.length).toEqual(1);
      expect(response.errors[0].message).toEqual(
        'Error updating rule: could not add snooze - Rule cannot have more than 5 snooze schedules'
      );
    });
  });

  describe('apiKey operations', () => {
    beforeEach(() => {
      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          {
            ...existingDecryptedRule,
            attributes: { ...existingDecryptedRule.attributes, tags: ['foo'] },
          },
        ],
      });
    });
    test('should bulk update API key', async () => {
      // Does not generate API key for disabled rules
      await rulesClient.bulkEdit({
        filter: 'alert.attributes.tags: "APM"',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
      });

      expect(createAPIKeyMock).not.toHaveBeenCalled();

      // Explicitly bulk editing the apiKey will set the api key, even if the rule is disabled
      const result = await rulesClient.bulkEdit({
        filter: 'alert.attributes.tags: "APM"',
        operations: [
          {
            field: 'apiKey',
            operation: 'set',
          },
        ],
      });

      expect(createAPIKeyMock).toHaveBeenCalled();

      // Just API key updates do not result in an increment to revision
      expect(result.rules[0]).toHaveProperty('revision', 0);
    });
  });

  describe('mixed operations', () => {
    beforeEach(() => {
      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          {
            ...existingDecryptedRule,
            attributes: {
              ...existingDecryptedRule.attributes,
              tags: ['foo'],
              params: { index: ['index-1', 'index-2'] },
            },
          },
        ],
      });
    });

    it('should successfully update tags and index patterns and return updated rule', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {
              enabled: true,
              tags: ['foo', 'test-1'],
              alertTypeId: 'myType',
              schedule: { interval: '1m' },
              consumer: 'myApp',
              scheduledTaskId: 'task-123',
              executionStatus: {
                lastExecutionDate: '2019-02-12T21:01:22.479Z',
                status: 'pending',
              },
              params: {
                index: ['index-1', 'index-2', 'index-3'],
              },
              throttle: null,
              notifyWhen: null,
              actions: [],
              revision: 0,
            },
            references: [],
            version: '123',
          },
        ],
      });

      paramsModifier.mockResolvedValue({
        modifiedParams: {
          index: ['index-1', 'index-2', 'index-3'],
        },
        isParamsUpdateSkipped: false,
      });

      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
        paramsModifier,
      });

      expect(result.rules[0]).toHaveProperty('tags', ['foo', 'test-1']);
      expect(result.rules[0]).toHaveProperty('params.index', ['index-1', 'index-2', 'index-3']);

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: expect.objectContaining({
              tags: ['foo', 'test-1'],
              params: {
                index: ['index-1', 'index-2', 'index-3'],
              },
              revision: 1,
            }),
          }),
        ],
        { overwrite: true }
      );
    });

    it('should successfully update rule if tags are updated but index patterns are not', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {
              enabled: true,
              tags: ['foo', 'test-1'],
              alertTypeId: 'myType',
              schedule: { interval: '1m' },
              consumer: 'myApp',
              scheduledTaskId: 'task-123',
              executionStatus: {
                lastExecutionDate: '2019-02-12T21:01:22.479Z',
                status: 'pending',
              },
              params: {
                index: ['index-1', 'index-2'],
              },
              throttle: null,
              notifyWhen: null,
              actions: [],
              revision: 0,
            },
            references: [],
            version: '123',
          },
        ],
      });

      paramsModifier.mockResolvedValue({
        modifiedParams: {
          index: ['index-1', 'index-2'],
        },
        isParamsUpdateSkipped: true,
      });

      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
        paramsModifier,
      });

      expect(result.rules[0]).toHaveProperty('tags', ['foo', 'test-1']);
      expect(result.rules[0]).toHaveProperty('params.index', ['index-1', 'index-2']);
      expect(result.skipped).toHaveLength(0);

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: expect.objectContaining({
              tags: ['foo', 'test-1'],
              params: {
                index: ['index-1', 'index-2'],
              },
              revision: 1,
            }),
          }),
        ],
        { overwrite: true }
      );
    });

    it('should successfully update rule if index patterns are updated but tags are not', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {
              enabled: true,
              tags: ['foo'],
              alertTypeId: 'myType',
              schedule: { interval: '1m' },
              consumer: 'myApp',
              scheduledTaskId: 'task-123',
              executionStatus: {
                lastExecutionDate: '2019-02-12T21:01:22.479Z',
                status: 'pending',
              },
              params: {
                index: ['index-1', 'index-2', 'index-3'],
              },
              throttle: null,
              notifyWhen: null,
              actions: [],
              revision: 0,
            },
            references: [],
            version: '123',
          },
        ],
      });

      paramsModifier.mockResolvedValue({
        modifiedParams: {
          index: ['index-1', 'index-2', 'index-3'],
        },
        isParamsUpdateSkipped: false,
      });

      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['foo'],
          },
        ],
        paramsModifier,
      });

      expect(result.rules[0]).toHaveProperty('tags', ['foo']);
      expect(result.rules[0]).toHaveProperty('params.index', ['index-1', 'index-2', 'index-3']);
      expect(result.skipped).toHaveLength(0);

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: expect.objectContaining({
              tags: ['foo'],
              params: {
                index: ['index-1', 'index-2', 'index-3'],
              },
              revision: 1,
            }),
          }),
        ],
        { overwrite: true }
      );
    });

    it('should skip rule update if neither index patterns nor tags are updated', async () => {
      paramsModifier.mockResolvedValue({
        modifiedParams: {
          index: ['index-1', 'index-2'],
        },
        isParamsUpdateSkipped: true,
      });

      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['foo'],
          },
        ],
        paramsModifier,
      });

      expect(result.skipped[0]).toHaveProperty('id', existingRule.id);
      expect(result.skipped[0]).toHaveProperty('skip_reason', 'RULE_NOT_MODIFIED');

      expect(result.rules).toHaveLength(0);

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(0);
      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(0);
    });
  });

  describe('ruleTypes aggregation and validation', () => {
    test('should call unsecuredSavedObjectsClient.find for aggregations by alertTypeId and consumer', async () => {
      await rulesClient.bulkEdit({
        filter: 'alert.attributes.tags: "APM"',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
      });

      expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith({
        aggs: {
          alertTypeId: {
            multi_terms: {
              terms: [
                {
                  field: 'alert.attributes.alertTypeId',
                },
                {
                  field: 'alert.attributes.consumer',
                },
              ],
            },
          },
        },
        filter: {
          arguments: [
            {
              type: 'literal',
              value: 'alert.attributes.tags',
              isQuoted: false,
            },
            {
              type: 'literal',
              value: 'APM',
              isQuoted: true,
            },
          ],
          function: 'is',
          type: 'function',
        },
        page: 1,
        perPage: 0,
        type: RULE_SAVED_OBJECT_TYPE,
      });
    });
    test('should call unsecuredSavedObjectsClient.find for aggregations when called with ids options', async () => {
      await rulesClient.bulkEdit({
        ids: ['2', '3'],
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
      });

      expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith({
        aggs: {
          alertTypeId: {
            multi_terms: {
              terms: [
                {
                  field: 'alert.attributes.alertTypeId',
                },
                {
                  field: 'alert.attributes.consumer',
                },
              ],
            },
          },
        },
        filter: {
          arguments: [
            {
              arguments: [
                {
                  type: 'literal',
                  value: 'alert.id',
                  isQuoted: false,
                },
                {
                  type: 'literal',
                  value: 'alert:2',
                  isQuoted: false,
                },
              ],
              function: 'is',
              type: 'function',
            },
            {
              arguments: [
                {
                  type: 'literal',
                  value: 'alert.id',
                  isQuoted: false,
                },
                {
                  type: 'literal',
                  value: 'alert:3',
                  isQuoted: false,
                },
              ],
              function: 'is',
              type: 'function',
            },
          ],
          function: 'or',
          type: 'function',
        },
        page: 1,
        perPage: 0,
        type: RULE_SAVED_OBJECT_TYPE,
      });
    });
    test('should throw if number of matched rules greater than 10_000', async () => {
      unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
        aggregations: {
          alertTypeId: {
            buckets: [{ key: ['myType', 'myApp'], key_as_string: 'myType|myApp', doc_count: 1 }],
          },
        },
        saved_objects: [],
        per_page: 0,
        page: 0,
        total: 10001,
      });

      await expect(
        rulesClient.bulkEdit({
          filter: 'alert.attributes.tags: "APM"',
          operations: [
            {
              field: 'tags',
              operation: 'add',
              value: ['test-1'],
            },
          ],
        })
      ).rejects.toThrow('More than 10000 rules matched for bulk edit');
    });

    test('should throw if aggregations result is invalid', async () => {
      unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
        aggregations: {
          alertTypeId: {},
        },
        saved_objects: [],
        per_page: 0,
        page: 0,
        total: 0,
      });

      await expect(
        rulesClient.bulkEdit({
          filter: 'alert.attributes.tags: "APM"',
          operations: [
            {
              field: 'tags',
              operation: 'add',
              value: ['test-1'],
            },
          ],
        })
      ).rejects.toThrow('No rules found for bulk edit');
    });

    test('should throw if ruleType is not enabled', async () => {
      ruleTypeRegistry.ensureRuleTypeEnabled.mockImplementation(() => {
        throw new Error('Not enabled');
      });

      await expect(
        rulesClient.bulkEdit({
          filter: 'alert.attributes.tags: "APM"',
          operations: [
            {
              field: 'tags',
              operation: 'add',
              value: ['test-1'],
            },
          ],
        })
      ).rejects.toThrow('Not enabled');

      expect(ruleTypeRegistry.ensureRuleTypeEnabled).toHaveBeenLastCalledWith('myType');
    });

    test('should throw if ruleType is not authorized', async () => {
      authorization.ensureAuthorized.mockImplementation(() => {
        throw new Error('Unauthorized');
      });

      await expect(
        rulesClient.bulkEdit({
          filter: 'alert.attributes.tags: "APM"',
          operations: [
            {
              field: 'tags',
              operation: 'add',
              value: ['test-1'],
            },
          ],
        })
      ).rejects.toThrow('Unauthorized');

      expect(authorization.ensureAuthorized).toHaveBeenLastCalledWith({
        consumer: 'myApp',
        entity: 'rule',
        operation: 'bulkEdit',
        ruleTypeId: 'myType',
      });
    });
  });

  describe('apiKeys', () => {
    beforeEach(() => {
      createAPIKeyMock.mockResolvedValueOnce({ apiKeysEnabled: true, result: { api_key: '111' } });
      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          {
            ...existingDecryptedRule,
            attributes: { ...existingDecryptedRule.attributes, enabled: true },
          },
        ],
      });
    });

    test('should call createPointInTimeFinderDecryptedAsInternalUser that returns api Keys', async () => {
      await rulesClient.bulkEdit({
        filter: 'alert.attributes.tags: "APM"',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
      });

      expect(
        encryptedSavedObjects.createPointInTimeFinderDecryptedAsInternalUser
      ).toHaveBeenCalledWith({
        filter: {
          arguments: [
            {
              type: 'literal',
              value: 'alert.attributes.tags',
              isQuoted: false,
            },
            {
              type: 'literal',
              value: 'APM',
              isQuoted: true,
            },
          ],
          function: 'is',
          type: 'function',
        },
        perPage: 100,
        type: RULE_SAVED_OBJECT_TYPE,
        namespaces: ['default'],
      });
    });

    test('should call bulkMarkApiKeysForInvalidation with keys apiKeys to invalidate', async () => {
      await rulesClient.bulkEdit({
        filter: 'alert.attributes.tags: "APM"',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
      });

      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
        { apiKeys: ['MTIzOmFiYw=='] },
        expect.any(Object),
        expect.any(Object)
      );
    });

    test('should call bulkMarkApiKeysForInvalidation to invalidate unused keys if bulkCreate failed', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockImplementation(() => {
        throw new Error('Fail');
      });

      await expect(
        rulesClient.bulkEdit({
          filter: 'alert.attributes.tags: "APM"',
          operations: [
            {
              field: 'tags',
              operation: 'add',
              value: ['test-1'],
            },
          ],
        })
      ).rejects.toThrow('Fail');

      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(1);
      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
        { apiKeys: ['dW5kZWZpbmVkOjExMQ=='] },
        expect.any(Object),
        expect.any(Object)
      );
    });

    test('should call bulkMarkApiKeysForInvalidation to invalidate unused keys if SO update failed', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {
              enabled: true,
              tags: ['foo'],
              alertTypeId: 'myType',
              schedule: { interval: '1m' },
              consumer: 'myApp',
              scheduledTaskId: 'task-123',
              executionStatus: {
                lastExecutionDate: '2019-02-12T21:01:22.479Z',
                status: 'pending',
              },
              params: { index: ['test-index-*'] },
              throttle: null,
              notifyWhen: null,
              actions: [],
            },
            references: [],
            version: '123',
            error: {
              error: 'test failure',
              statusCode: 500,
              message: 'test failure',
            },
          },
        ],
      });

      await rulesClient.bulkEdit({
        filter: 'alert.attributes.tags: "APM"',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
      });

      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
        { apiKeys: ['dW5kZWZpbmVkOjExMQ=='] },
        expect.any(Object),
        expect.any(Object)
      );
    });

    test('should not call create apiKey if rule is disabled', async () => {
      await rulesClient.bulkEdit({
        filter: 'alert.attributes.tags: "APM"',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
      });
      expect(rulesClientParams.createAPIKey).not.toHaveBeenCalledWith();
    });

    test('should return error in rule errors if key is not generated', async () => {
      await rulesClient.bulkEdit({
        filter: 'alert.attributes.tags: "APM"',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
      });
      expect(rulesClientParams.createAPIKey).toHaveBeenCalledWith('Alerting: myType/my rule name');
    });

    describe('set by the user when authenticated using api keys', () => {
      beforeEach(() => {
        isAuthenticationTypeApiKeyMock.mockReturnValue(true);
        getAuthenticationApiKeyMock.mockReturnValue({
          apiKeysEnabled: true,
          result: { api_key: '111' },
        });
        mockCreatePointInTimeFinderAsInternalUser({
          saved_objects: [
            {
              ...existingDecryptedRule,
              attributes: {
                ...existingDecryptedRule.attributes,
                enabled: true,
                apiKeyCreatedByUser: true,
              },
            },
          ],
        });
      });

      test('should not call bulkMarkApiKeysForInvalidation', async () => {
        await rulesClient.bulkEdit({
          filter: 'alert.attributes.tags: "APM"',
          operations: [
            {
              field: 'tags',
              operation: 'add',
              value: ['test-1'],
            },
          ],
        });

        expect(bulkMarkApiKeysForInvalidation).not.toHaveBeenCalled();
      });

      test('should call bulkMarkApiKeysForInvalidation with empty array if bulkCreate failed', async () => {
        unsecuredSavedObjectsClient.bulkCreate.mockImplementation(() => {
          throw new Error('Fail');
        });

        await expect(
          rulesClient.bulkEdit({
            filter: 'alert.attributes.tags: "APM"',
            operations: [
              {
                field: 'tags',
                operation: 'add',
                value: ['test-1'],
              },
            ],
          })
        ).rejects.toThrow('Fail');

        expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(1);
        expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
          { apiKeys: [] },
          expect.any(Object),
          expect.any(Object)
        );
      });

      test('should call bulkMarkApiKeysForInvalidation with empty array if SO update failed', async () => {
        unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
          saved_objects: [
            {
              id: '1',
              type: RULE_SAVED_OBJECT_TYPE,
              attributes: {
                enabled: true,
                tags: ['foo'],
                alertTypeId: 'myType',
                schedule: { interval: '1m' },
                consumer: 'myApp',
                scheduledTaskId: 'task-123',
                params: { index: ['test-index-*'] },
                throttle: null,
                notifyWhen: null,
                actions: [],
              },
              references: [],
              version: '123',
              error: {
                error: 'test failure',
                statusCode: 500,
                message: 'test failure',
              },
            },
          ],
        });

        await rulesClient.bulkEdit({
          filter: 'alert.attributes.tags: "APM"',
          operations: [
            {
              field: 'tags',
              operation: 'add',
              value: ['test-1'],
            },
          ],
        });

        expect(bulkMarkApiKeysForInvalidation).not.toHaveBeenCalled();
      });

      test('should not call get apiKey if rule is disabled', async () => {
        await rulesClient.bulkEdit({
          filter: 'alert.attributes.tags: "APM"',
          operations: [
            {
              field: 'tags',
              operation: 'add',
              value: ['test-1'],
            },
          ],
        });
        expect(rulesClientParams.getAuthenticationAPIKey).not.toHaveBeenCalledWith();
      });

      test('should return error in rule errors if key is not generated', async () => {
        await rulesClient.bulkEdit({
          filter: 'alert.attributes.tags: "APM"',
          operations: [
            {
              field: 'tags',
              operation: 'add',
              value: ['test-1'],
            },
          ],
        });
        expect(rulesClientParams.getAuthenticationAPIKey).toHaveBeenCalledWith(
          'Alerting: myType/my rule name-user-created'
        );
      });
    });
  });

  describe('params validation', () => {
    beforeEach(() => {
      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [existingDecryptedRule],
      });
    });

    test('should return error for rule that failed params validation', async () => {
      ruleTypeRegistry.get.mockReturnValue({
        id: '123',
        name: 'Test',
        actionGroups: [{ id: 'default', name: 'Default' }],
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        recoveryActionGroup: RecoveredActionGroup,
        validate: {
          params: schema.object({
            param1: schema.string(),
          }),
        },
        async executor() {
          return { state: {} };
        },
        producer: 'alerts',
        category: 'test',
        validLegacyConsumers: [],
      });

      const result = await rulesClient.bulkEdit({
        filter: 'alert.attributes.tags: "APM"',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
      });

      expect(result.errors).toHaveLength(1);

      expect(result.errors[0]).toHaveProperty(
        'message',
        'params invalid: [param1]: expected value of type [string] but got [undefined]'
      );
      expect(result.errors[0]).toHaveProperty('rule.id', '1');
      expect(result.errors[0]).toHaveProperty('rule.name', 'my rule name');
    });

    test('should validate mutatedParams for rules', async () => {
      ruleTypeRegistry.get.mockReturnValue({
        id: '123',
        name: 'Test',
        actionGroups: [{ id: 'default', name: 'Default' }],
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        recoveryActionGroup: RecoveredActionGroup,
        validate: {
          params: {
            validate: (rule) => rule as RuleTypeParams,
            validateMutatedParams: (rule: unknown) => {
              throw Error('Mutated error for rule');
            },
          },
        },
        async executor() {
          return { state: {} };
        },
        producer: 'alerts',
        category: 'test',
        validLegacyConsumers: [],
      });

      const result = await rulesClient.bulkEdit({
        filter: 'alert.attributes.tags: "APM"',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1', 'another-tag'],
          },
        ],
      });

      expect(result.errors).toHaveLength(1);

      expect(result.errors[0]).toHaveProperty(
        'message',
        'Mutated params invalid: Mutated error for rule'
      );
      expect(result.errors[0]).toHaveProperty('rule.id', '1');
      expect(result.errors[0]).toHaveProperty('rule.name', 'my rule name');
    });
  });

  describe('attributes validation', () => {
    test('should not update saved object and return error if SO has interval less than minimum configured one when enforce = true', async () => {
      rulesClient = new RulesClient({
        ...rulesClientParams,
        minimumScheduleInterval: { value: '3m', enforce: true },
      });

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [],
      });

      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
        paramsModifier: async (rule) => {
          const params = rule.params;
          params.index = ['test-index-*'];

          return { modifiedParams: params, isParamsUpdateSkipped: false, skipReasons: [] };
        },
      });

      expect(result.errors).toHaveLength(1);
      expect(result.rules).toHaveLength(0);
      expect(result.errors[0].message).toBe(
        'Error updating rule: the interval is less than the allowed minimum interval of 3m'
      );
    });

    test('should not update saved object and return error if schedule interval is shorter than any action frequency in the rule', async () => {
      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          {
            ...existingDecryptedRule,
            attributes: {
              ...existingDecryptedRule.attributes,
              actions: [
                {
                  actionRef: 'action_0',
                  actionTypeId: 'test',
                  frequency: { notifyWhen: 'onThrottleInterval', summary: false, throttle: '5m' },
                  group: 'default',
                  params: {},
                  uuid: '111',
                },
                {
                  actionRef: 'action_1',
                  actionTypeId: '',
                  frequency: { notifyWhen: 'onThrottleInterval', summary: true, throttle: '10s' },
                  group: 'default',
                  params: {},
                  uuid: '100',
                },
              ],
            } as any,
            references: [
              {
                name: 'action_0',
                type: 'action',
                id: '1',
              },
              {
                name: 'action_1',
                type: 'action',
                id: '2',
              },
            ] as any,
          },
        ],
      });

      const result = await rulesClient.bulkEdit({
        operations: [
          {
            field: 'schedule',
            operation: 'set',
            value: { interval: '10m' },
          },
        ],
      });

      expect(result.errors).toHaveLength(1);
      expect(result.rules).toHaveLength(0);
      expect(result.errors[0].message).toBe(
        `Error updating rule with ID "${existingDecryptedRule.id}": the interval 10m is longer than the action frequencies`
      );
    });

    test('should only validate schedule limit if schedule is being modified', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {
              enabled: true,
              tags: ['foo', 'test-1'],
              alertTypeId: 'myType',
              schedule: { interval: '1m' },
              consumer: 'myApp',
              scheduledTaskId: 'task-123',
              executionStatus: {
                lastExecutionDate: '2019-02-12T21:01:22.479Z',
                status: 'pending',
              },
              params: {},
              throttle: null,
              notifyWhen: null,
              actions: [],
              revision: 0,
            },
            references: [],
            version: '123',
          },
        ],
      });

      await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
      });

      expect(validateScheduleLimit).toHaveBeenCalledTimes(0);

      await rulesClient.bulkEdit({
        operations: [
          {
            field: 'schedule',
            operation: 'set',
            value: { interval: '2m' },
          },
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
      });

      expect(validateScheduleLimit).toHaveBeenCalledTimes(1);
    });

    test('should not validate scheduling on system actions', async () => {
      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          {
            ...existingDecryptedRule,
            attributes: {
              ...existingDecryptedRule.attributes,
              actions: [
                {
                  actionRef: 'action_0',
                  actionTypeId: 'test',
                  params: {},
                  uuid: '111',
                },
              ],
            } as any,
            references: [
              {
                name: 'action_0',
                type: 'action',
                id: '1',
              },
            ] as any,
          },
        ],
      });

      const result = await rulesClient.bulkEdit({
        operations: [
          {
            field: 'schedule',
            operation: 'set',
            value: { interval: '10m' },
          },
        ],
      });

      expect(result.errors).toHaveLength(0);
      expect(result.rules).toHaveLength(1);
    });
  });

  describe('paramsModifier', () => {
    test('should update index pattern params', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {
              enabled: true,
              tags: ['foo'],
              alertTypeId: 'myType',
              schedule: { interval: '1m' },
              consumer: 'myApp',
              scheduledTaskId: 'task-123',
              executionStatus: {
                lastExecutionDate: '2019-02-12T21:01:22.479Z',
                status: 'pending',
              },
              params: { index: ['test-index-*'] },
              throttle: null,
              notifyWhen: null,
              actions: [],
            },
            references: [],
            version: '123',
          },
        ],
      });

      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
        paramsModifier: async (rule) => {
          const params = rule.params;
          params.index = ['test-index-*'];

          return { modifiedParams: params, isParamsUpdateSkipped: false, skipReasons: [] };
        },
      });

      expect(result.errors).toHaveLength(0);
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0]).toHaveProperty('params.index', ['test-index-*']);

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: expect.objectContaining({
              params: expect.objectContaining({
                index: ['test-index-*'],
              }),
            }),
          }),
        ],
        { overwrite: true }
      );
    });
  });

  describe('method input validation', () => {
    test('should throw error when both ids and filter supplied in method call', async () => {
      await expect(
        rulesClient.bulkEdit({
          filter: 'alert.attributes.tags: "APM"',
          ids: ['1', '2'],
          operations: [
            {
              field: 'tags',
              operation: 'add',
              value: ['test-1'],
            },
          ],
        })
      ).rejects.toThrow(
        "Both 'filter' and 'ids' are supplied. Define either 'ids' or 'filter' properties in method arguments"
      );
    });
  });

  describe('task manager', () => {
    test('should call task manager method bulkCreateSchedules if operation set new schedules', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {
              enabled: true,
              tags: ['foo'],
              alertTypeId: 'myType',
              schedule: { interval: '1m' },
              consumer: 'myApp',
              scheduledTaskId: 'task-123',
              executionStatus: {
                lastExecutionDate: '2019-02-12T21:01:22.479Z',
                status: 'pending',
              },
              params: { index: ['test-index-*'] },
              throttle: null,
              notifyWhen: null,
              actions: [],
            },
            references: [],
            version: '123',
          },
        ],
      });

      await rulesClient.bulkEdit({
        operations: [
          {
            field: 'schedule',
            operation: 'set',
            value: { interval: '10m' },
          },
        ],
      });

      expect(taskManager.bulkUpdateSchedules).toHaveBeenCalledWith(['task-123'], {
        interval: '10m',
      });
    });

    test('should not call task manager method bulkCreateSchedules if operation is not set schedule', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {
              enabled: true,
              tags: ['foo'],
              alertTypeId: 'myType',
              schedule: { interval: '1m' },
              executionStatus: {
                lastExecutionDate: '2019-02-12T21:01:22.479Z',
                status: 'pending',
              },
              consumer: 'myApp',
              params: { index: ['test-index-*'] },
              throttle: null,
              notifyWhen: null,
              actions: [],
            },
            references: [],
            version: '123',
          },
        ],
      });

      await rulesClient.bulkEdit({
        operations: [
          {
            field: 'tags',
            operation: 'set',
            value: ['test-tag'],
          },
        ],
      });

      expect(taskManager.bulkUpdateSchedules).not.toHaveBeenCalled();
    });
  });

  describe('legacy actions migration for SIEM', () => {
    test('should call migrateLegacyActions', async () => {
      encryptedSavedObjects.createPointInTimeFinderDecryptedAsInternalUser = jest
        .fn()
        .mockResolvedValueOnce({
          close: jest.fn(),
          find: function* asyncGenerator() {
            yield { saved_objects: [enabledRule1, enabledRule2, siemRule1, siemRule2] };
          },
        });

      await rulesClient.bulkEdit({
        operations: [
          {
            field: 'tags',
            operation: 'set',
            value: ['test-tag'],
          },
        ],
      });

      expect(migrateLegacyActions).toHaveBeenCalledTimes(4);
      expect(migrateLegacyActions).toHaveBeenCalledWith(expect.any(Object), {
        attributes: enabledRule1.attributes,
        ruleId: enabledRule1.id,
        actions: [],
        references: [],
      });
      expect(migrateLegacyActions).toHaveBeenCalledWith(expect.any(Object), {
        attributes: enabledRule2.attributes,
        ruleId: enabledRule2.id,
        actions: [],
        references: [],
      });
      expect(migrateLegacyActions).toHaveBeenCalledWith(expect.any(Object), {
        attributes: expect.objectContaining({ consumer: AlertConsumers.SIEM }),
        ruleId: siemRule1.id,
        actions: [],
        references: [],
      });
      expect(migrateLegacyActions).toHaveBeenCalledWith(expect.any(Object), {
        attributes: expect.objectContaining({ consumer: AlertConsumers.SIEM }),
        ruleId: siemRule2.id,
        actions: [],
        references: [],
      });
    });
  });
});
