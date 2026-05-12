/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  savedObjectsClientMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
  coreFeatureFlagsMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import type { ActionsAuthorization, ActionsClient } from '@kbn/actions-plugin/server';
import { createMockConnector } from '@kbn/actions-plugin/server/application/connector/mocks';
import { ruleTypeRegistryMock } from '../../../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../../../authorization/alerting_authorization.mock';
import type { AlertingAuthorization } from '../../../../authorization/alerting_authorization';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { ConnectorAdapterRegistry } from '../../../../connector_adapters/connector_adapter_registry';
import { backfillClientMock } from '../../../../backfill_client/backfill_client.mock';
import { getBeforeSetup, setGlobalDate } from '../../../../rules_client/tests/lib';
import type { ConstructorOptions } from '../../../../rules_client/rules_client';
import { RulesClient } from '../../../../rules_client/rules_client';
import { ENABLED_RULE_REJECTION_MESSAGE } from './bulk_create_rules';

jest.mock('@kbn/core-saved-objects-utils-server', () => {
  const actual = jest.requireActual('@kbn/core-saved-objects-utils-server');
  let id = 0;
  return {
    ...actual,
    SavedObjectsUtils: {
      generateId: () => `mock-id-${++id}`,
    },
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
  kibanaVersion: 'v8.0.0',
  auditLogger,
  maxScheduledPerMinute: 10000,
  minimumScheduleInterval: { value: '1m', enforce: false },
  isAuthenticationTypeAPIKey: jest.fn(),
  getAuthenticationAPIKey: jest.fn(),
  getAlertIndicesAlias: jest.fn(),
  alertsService: null,
  backfillClient: backfillClientMock.create(),
  connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  isSystemAction: jest.fn(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
  featureFlags: coreFeatureFlagsMock.createStart(),
  isServerless: false,
};

setGlobalDate();

const baseDisabledRuleData = (overrides: Record<string, unknown> = {}) => ({
  enabled: false,
  name: 'test rule',
  tags: ['t1'],
  alertTypeId: '123',
  consumer: 'bar',
  schedule: { interval: '1m' },
  throttle: null,
  notifyWhen: null,
  params: { foo: true },
  actions: [],
  ...overrides,
});

const mockBulkCreateResponse = (rules: Array<{ id: string; name: string }>) => {
  unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
    saved_objects: rules.map((r) => ({
      id: r.id,
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: {
        alertTypeId: '123',
        name: r.name,
        enabled: false,
        consumer: 'bar',
        schedule: { interval: '1m' },
        params: { foo: true },
        actions: [],
        createdBy: 'elastic',
        updatedBy: 'elastic',
        createdAt: '2019-02-12T21:01:22.479Z',
        updatedAt: '2019-02-12T21:01:22.479Z',
        snoozeSchedule: [],
        muteAll: false,
        mutedInstanceIds: [],
        executionStatus: { status: 'pending', lastExecutionDate: '2019-02-12T21:01:22.479Z' },
        revision: 0,
        running: false,
        apiKey: null,
        apiKeyOwner: null,
        apiKeyCreatedByUser: null,
      },
      references: [],
    })) as never,
  });
};

describe('bulkCreateRules', () => {
  let rulesClient: RulesClient;
  let actionsClient: jest.Mocked<ActionsClient>;

  beforeEach(async () => {
    getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
    (auditLogger.log as jest.Mock).mockClear();
    rulesClient = new RulesClient(rulesClientParams);
    actionsClient = (await rulesClientParams.getActionsClient()) as jest.Mocked<ActionsClient>;
    actionsClient.getBulk.mockResolvedValue([
      createMockConnector({ id: '1', actionTypeId: 'test', name: 'a' }),
    ]);
    actionsClient.listTypes.mockResolvedValue([]);
    actionsClient.isSystemAction.mockReturnValue(false);
    rulesClientParams.getActionsClient.mockResolvedValue(actionsClient);
    rulesClientParams.createAPIKey.mockResolvedValue({ apiKeysEnabled: false });
    rulesClientParams.isAuthenticationTypeAPIKey.mockReturnValue(false);
  });

  test('returns empty result when given an empty rules array', async () => {
    const result = await rulesClient.bulkCreateRules({ rules: [] });
    expect(result).toEqual({ rules: [], errors: [], total: 0 });
    expect(unsecuredSavedObjectsClient.bulkCreate).not.toHaveBeenCalled();
  });

  test('persists all disabled rules in a single bulkCreate call', async () => {
    mockBulkCreateResponse([
      { id: 'mock-id-1', name: 'r1' },
      { id: 'mock-id-2', name: 'r2' },
    ]);

    const result = await rulesClient.bulkCreateRules({
      rules: [
        { data: baseDisabledRuleData({ name: 'r1' }) },
        { data: baseDisabledRuleData({ name: 'r2' }) },
      ],
    });

    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0][0]).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.errors).toEqual([]);
    expect(result.rules).toHaveLength(2);
  });

  test('never calls task manager or generates API keys', async () => {
    mockBulkCreateResponse([{ id: 'mock-id-1', name: 'r1' }]);

    await rulesClient.bulkCreateRules({
      rules: [{ data: baseDisabledRuleData({ name: 'r1' }) }],
    });

    expect(taskManager.bulkSchedule).not.toHaveBeenCalled();
    expect(taskManager.schedule).not.toHaveBeenCalled();
    expect(rulesClientParams.createAPIKey).not.toHaveBeenCalled();
    expect(rulesClientParams.getAuthenticationAPIKey).not.toHaveBeenCalled();
  });

  test('rejects every enabled rule with a per-rule error and skips them from bulkCreate', async () => {
    mockBulkCreateResponse([{ id: 'mock-id-1', name: 'd1' }]);

    const result = await rulesClient.bulkCreateRules({
      rules: [
        { data: baseDisabledRuleData({ name: 'enabled-1', enabled: true }) },
        { data: baseDisabledRuleData({ name: 'd1' }) },
        {
          data: baseDisabledRuleData({ name: 'enabled-2', enabled: true }),
          options: { id: 'caller-id' },
        },
      ],
    });

    expect(result.total).toBe(3);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toEqual({
      message: ENABLED_RULE_REJECTION_MESSAGE,
      rule: { id: 'n/a', name: 'enabled-1' },
    });
    expect(result.errors[1]).toEqual({
      message: ENABLED_RULE_REJECTION_MESSAGE,
      rule: { id: 'caller-id', name: 'enabled-2' },
    });
    expect(result.rules).toHaveLength(1);
    expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0][0]).toHaveLength(1);
  });

  test('returns no rules but every input as an error when all rules are enabled', async () => {
    const result = await rulesClient.bulkCreateRules({
      rules: [
        { data: baseDisabledRuleData({ name: 'e1', enabled: true }) },
        { data: baseDisabledRuleData({ name: 'e2', enabled: true }) },
      ],
    });

    expect(result.total).toBe(2);
    expect(result.errors).toHaveLength(2);
    expect(result.rules).toHaveLength(0);
    expect(unsecuredSavedObjectsClient.bulkCreate).not.toHaveBeenCalled();
    expect(taskManager.bulkSchedule).not.toHaveBeenCalled();
  });

  test('per-rule prepare failure is isolated and remaining rules persist', async () => {
    ruleTypeRegistry.get
      .mockImplementationOnce(() => {
        throw new Error('rule type not found');
      })
      .mockImplementation(() => ({
        id: '123',
        name: 'Test',
        actionGroups: [{ id: 'default', name: 'Default' }],
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        async executor() {
          return { state: {} };
        },
        category: 'test',
        producer: 'alerts',
        solution: 'stack',
        validate: { params: { validate: (params) => params } },
        validLegacyConsumers: [],
      }));

    mockBulkCreateResponse([{ id: 'mock-id-2', name: 'good' }]);

    const result = await rulesClient.bulkCreateRules({
      rules: [
        { data: baseDisabledRuleData({ name: 'bad', alertTypeId: 'unknown' }) },
        { data: baseDisabledRuleData({ name: 'good' }) },
      ],
    });

    expect(result.total).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].rule.name).toBe('bad');
    expect(result.rules).toHaveLength(1);
    expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0][0]).toHaveLength(1);
  });

  test('partial SO bulkCreate failure populates errors and returns successful rules', async () => {
    unsecuredSavedObjectsClient.bulkCreate.mockImplementation(async (objects) => {
      const [first, second] = objects as Array<{ id: string }>;
      return {
        saved_objects: [
          {
            id: first.id,
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {
              alertTypeId: '123',
              name: 'r1',
              enabled: false,
              consumer: 'bar',
              schedule: { interval: '1m' },
              params: { foo: true },
              actions: [],
              createdBy: 'elastic',
              updatedBy: 'elastic',
              createdAt: '2019-02-12T21:01:22.479Z',
              updatedAt: '2019-02-12T21:01:22.479Z',
              snoozeSchedule: [],
              muteAll: false,
              mutedInstanceIds: [],
              executionStatus: {
                status: 'pending',
                lastExecutionDate: '2019-02-12T21:01:22.479Z',
              },
              revision: 0,
              running: false,
              apiKey: null,
              apiKeyOwner: null,
              apiKeyCreatedByUser: null,
            },
            references: [],
          },
          {
            id: second.id,
            type: RULE_SAVED_OBJECT_TYPE,
            error: { error: 'Conflict', message: 'duplicate', statusCode: 409 },
          },
        ],
      } as never;
    });

    const result = await rulesClient.bulkCreateRules({
      rules: [
        { data: baseDisabledRuleData({ name: 'r1' }) },
        { data: baseDisabledRuleData({ name: 'r2' }) },
      ],
    });

    const submittedIds = (
      unsecuredSavedObjectsClient.bulkCreate.mock.calls[0][0] as Array<{ id: string }>
    ).map((o) => o.id);

    expect(result.total).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].rule.id).toBe(submittedIds[1]);
    expect(result.errors[0].status).toBe(409);
    expect(result.rules).toHaveLength(1);
  });

  test('whole-batch SO bulkCreate throw propagates', async () => {
    unsecuredSavedObjectsClient.bulkCreate.mockRejectedValue(new Error('boom'));

    await expect(
      rulesClient.bulkCreateRules({
        rules: [{ data: baseDisabledRuleData({ name: 'r1' }) }],
      })
    ).rejects.toThrow('boom');
  });

  test('persisted SO has no apiKey, no scheduledTaskId, and no lastEnabledAt', async () => {
    mockBulkCreateResponse([{ id: 'mock-id-1', name: 'r1' }]);

    await rulesClient.bulkCreateRules({
      rules: [{ data: baseDisabledRuleData({ name: 'r1' }) }],
    });

    const submitted = unsecuredSavedObjectsClient.bulkCreate.mock.calls[0][0] as Array<{
      attributes: Record<string, unknown>;
    }>;
    expect(submitted[0].attributes.apiKey).toBeNull();
    expect(submitted[0].attributes.apiKeyOwner).toBeNull();
    expect(submitted[0].attributes.apiKeyCreatedByUser).toBeNull();
    expect(submitted[0].attributes.scheduledTaskId).toBeUndefined();
    expect(submitted[0].attributes.lastEnabledAt).toBeUndefined();
    expect(submitted[0].attributes.enabled).toBe(false);
  });
});
