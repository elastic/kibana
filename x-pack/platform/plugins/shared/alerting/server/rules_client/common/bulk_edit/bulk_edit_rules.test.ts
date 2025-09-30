/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import {
  loggingSystemMock,
  savedObjectsClientMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { ruleTypeRegistryMock } from '../../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../../authorization/alerting_authorization.mock';
import { ConnectorAdapterRegistry } from '../../../connector_adapters/connector_adapter_registry';
import { backfillClientMock } from '../../../backfill_client/backfill_client.mock';

import type { RulesClientContext } from '../../types';
import { bulkEditRules } from './bulk_edit_rules';
import {
  WriteOperations,
  type AlertingAuthorization,
  ReadOperations,
} from '../../../authorization';
import { RuleAuditAction } from '../audit_events';
import { bulkMarkApiKeysForInvalidation } from '../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { RawRule } from '../../../types';
import { RecoveredActionGroup, type BulkEditSkipReason } from '../../../types';
import type { SavedObject } from '@kbn/core/server';

jest.mock('../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation', () => ({
  bulkMarkApiKeysForInvalidation: jest.fn(),
}));

const actionsAuthorization = actionsAuthorizationMock.create() as unknown as ActionsAuthorization;
const auditLogger = auditLoggerMock.create();
const authorization = alertingAuthorizationMock.create();
const createAPIKeyMock = jest.fn();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const getAuthenticationApiKeyMock = jest.fn();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
const isAuthenticationTypeApiKeyMock = jest.fn();
const kibanaVersion = 'v8.2.0';
const logger = loggingSystemMock.create().get();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const taskManager = taskManagerMock.createStart();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();

const rulesClientContext: RulesClientContext = {
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: authorization as unknown as AlertingAuthorization,
  actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
  spaceId: 'default',
  namespace: 'default',
  getUserName: jest.fn(),
  createAPIKey: createAPIKeyMock,
  logger,
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
  fieldsToExcludeFromPublicApi: [],
  minimumScheduleIntervalInMs: 0,
};

const MOCK_API_KEY_1 = Buffer.from('123:abc').toString('base64');
const MOCK_API_KEY_2 = Buffer.from('123:abc').toString('base64');

const existingRule: SavedObject<RawRule> = {
  id: '1',
  type: RULE_SAVED_OBJECT_TYPE,
  attributes: {
    enabled: false,
    tags: ['foo'],
    createdBy: 'user',
    createdAt: '2019-02-12T21:01:22.479Z',
    updatedAt: '2019-02-12T21:01:22.479Z',
    muteAll: false,
    mutedInstanceIds: [],
    snoozeSchedule: [],
    alertTypeId: 'myType',
    schedule: { interval: '1m' },
    consumer: 'myApp',
    scheduledTaskId: 'task-123',
    // @ts-expect-error incomplete definition for testing
    executionStatus: {
      lastExecutionDate: '2019-02-12T21:01:22.479Z',
      status: 'pending',
    },
    params: {},
    throttle: null,
    notifyWhen: null,
    actions: [],
    artifacts: {
      dashboards: [],
      investigation_guide: { blob: '' },
    },
    name: 'my rule name',
    revision: 0,
  },
  references: [],
  version: '123',
};

const existingDecryptedRule: SavedObject<RawRule> = {
  ...existingRule,
  attributes: {
    ...existingRule.attributes,
    apiKey: MOCK_API_KEY_1,
    apiKeyCreatedByUser: false,
  },
};

const mockCreatePointInTimeFinderAsInternalUser = (
  response = { saved_objects: [existingDecryptedRule] }
) => {
  encryptedSavedObjects.createPointInTimeFinderDecryptedAsInternalUser = jest
    .fn()
    .mockResolvedValueOnce({
      close: jest.fn(),
      find: function* asyncGenerator() {
        yield response;
      },
    });
};

describe('bulkEditRules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      solution: 'stack',
      validate: {
        params: { validate: (params) => params },
      },
    });
  });

  test('should throw error when both ids and filter supplied in method call', async () => {
    await expect(
      bulkEditRules(rulesClientContext, {
        filter: 'alert.attributes.tags: "APM"',
        ids: ['1', '2'],
        name: `rulesClient.bulkEdit`,
        updateFn: jest.fn(),
        requiredAuthOperation: WriteOperations.BulkEdit,
        auditAction: RuleAuditAction.BULK_EDIT,
        shouldInvalidateApiKeys: false,
      })
    ).rejects.toThrow(
      "Both 'filter' and 'ids' are supplied. Define either 'ids' or 'filter' properties in method arguments"
    );
  });

  test('should correctly call findRulesSo with filter', async () => {
    await bulkEditRules(rulesClientContext, {
      filter: 'alert.attributes.tags: "APM"',
      name: `rulesClient.bulkEdit`,
      updateFn: jest.fn(),
      requiredAuthOperation: WriteOperations.BulkEdit,
      auditAction: RuleAuditAction.BULK_EDIT,
      shouldInvalidateApiKeys: false,
    });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith({
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
      filter: {
        arguments: [
          { isQuoted: false, type: 'literal', value: 'alert.attributes.tags' },
          { isQuoted: true, type: 'literal', value: 'APM' },
        ],
        function: 'is',
        type: 'function',
      },
      page: 1,
      perPage: 0,
      type: 'alert',
    });
  });

  test('should correctly call findRulesSo with id', async () => {
    await bulkEditRules(rulesClientContext, {
      ids: ['1', '2'],
      name: `rulesClient.bulkEdit`,
      updateFn: jest.fn(),
      requiredAuthOperation: WriteOperations.BulkEdit,
      auditAction: RuleAuditAction.BULK_EDIT,
      shouldInvalidateApiKeys: false,
    });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith({
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
      filter: {
        arguments: [
          {
            arguments: [
              { isQuoted: false, type: 'literal', value: 'alert.id' },
              { isQuoted: false, type: 'literal', value: 'alert:1' },
            ],
            function: 'is',
            type: 'function',
          },
          {
            arguments: [
              { isQuoted: false, type: 'literal', value: 'alert.id' },
              { isQuoted: false, type: 'literal', value: 'alert:2' },
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
      type: 'alert',
    });
  });

  test('should throw error if number of rules exceeds max', async () => {
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      aggregations: {},
      saved_objects: [],
      per_page: 0,
      page: 0,
      total: 10001,
    });
    await expect(
      bulkEditRules(rulesClientContext, {
        name: `rulesClient.bulkEdit`,
        updateFn: jest.fn(),
        shouldInvalidateApiKeys: false,
        requiredAuthOperation: WriteOperations.BulkEdit,
        auditAction: RuleAuditAction.BULK_EDIT,
      })
    ).rejects.toThrow('More than 10000 rules matched for bulk edit');
  });

  test('should throw error if no aggregation buckets found', async () => {
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      aggregations: { alertTypeId: {} },
      saved_objects: [],
      per_page: 0,
      page: 0,
      total: 1,
    });
    await expect(
      bulkEditRules(rulesClientContext, {
        name: `rulesClient.bulkEdit`,
        updateFn: jest.fn(),
        shouldInvalidateApiKeys: false,
        requiredAuthOperation: WriteOperations.BulkEdit,
        auditAction: RuleAuditAction.BULK_EDIT,
      })
    ).rejects.toThrow('No rules found for bulk edit');
  });

  test('should throw error if rule type is not enabled', async () => {
    ruleTypeRegistry.ensureRuleTypeEnabled.mockImplementationOnce(() => {
      throw new Error('Not enabled');
    });
    await expect(
      bulkEditRules(rulesClientContext, {
        name: `rulesClient.bulkEdit`,
        updateFn: jest.fn(),
        shouldInvalidateApiKeys: false,
        requiredAuthOperation: WriteOperations.BulkEdit,
        auditAction: RuleAuditAction.BULK_EDIT,
      })
    ).rejects.toThrow('Not enabled');
  });

  test('should throw error if rule type is not authorized for user', async () => {
    authorization.ensureAuthorized.mockImplementationOnce(() => {
      throw new Error('Unauthorized');
    });
    await expect(
      bulkEditRules(rulesClientContext, {
        name: `rulesClient.bulkEdit`,
        updateFn: jest.fn(),
        shouldInvalidateApiKeys: false,
        requiredAuthOperation: WriteOperations.BulkEdit,
        auditAction: RuleAuditAction.BULK_EDIT,
      })
    ).rejects.toThrow('Unauthorized');

    expect(authorization.ensureAuthorized).toHaveBeenLastCalledWith({
      consumer: 'myApp',
      entity: 'rule',
      operation: 'bulkEdit',
      ruleTypeId: 'myType',
    });
  });

  test('should call ensureAuthorized once for each unique rule type and with the required permission from the method call', async () => {
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      aggregations: {
        alertTypeId: {
          buckets: [
            { key: ['myType', 'myApp'], key_as_string: 'myType|myApp', doc_count: 1 },
            { key: ['myOtherType', 'myApp'], key_as_string: 'myOtherType|myApp', doc_count: 3 },
          ],
        },
      },
      saved_objects: [],
      per_page: 0,
      page: 0,
      total: 4,
    });
    await bulkEditRules(rulesClientContext, {
      name: `rulesClient.bulkEdit`,
      updateFn: jest.fn(),
      shouldInvalidateApiKeys: false,
      requiredAuthOperation: ReadOperations.BulkEditParams,
      auditAction: RuleAuditAction.BULK_EDIT,
    });

    expect(authorization.ensureAuthorized).toHaveBeenCalledTimes(2);
    expect(authorization.ensureAuthorized).toHaveBeenNthCalledWith(1, {
      consumer: 'myApp',
      entity: 'rule',
      operation: 'bulkEditParams',
      ruleTypeId: 'myType',
    });
    expect(authorization.ensureAuthorized).toHaveBeenNthCalledWith(2, {
      consumer: 'myApp',
      entity: 'rule',
      operation: 'bulkEditParams',
      ruleTypeId: 'myOtherType',
    });
  });

  test('should call updateFn callback once per rule to edit', async () => {
    const decryptedRule1 = {
      ...existingDecryptedRule,
      attributes: { ...existingDecryptedRule.attributes, enabled: true },
    };
    const decryptedRule2 = {
      ...existingDecryptedRule,
      id: '2',
      attributes: { ...existingDecryptedRule.attributes, apiKey: MOCK_API_KEY_2, enabled: true },
    };
    mockCreatePointInTimeFinderAsInternalUser({
      saved_objects: [decryptedRule1, decryptedRule2],
    });
    const updateFn = jest.fn();
    await bulkEditRules(rulesClientContext, {
      name: `rulesClient.bulkEdit`,
      updateFn,
      shouldInvalidateApiKeys: false,
      requiredAuthOperation: ReadOperations.BulkEditParams,
      auditAction: RuleAuditAction.BULK_EDIT,
    });

    expect(updateFn).toHaveBeenCalledTimes(2);
    expect(updateFn).toHaveBeenNthCalledWith(1, {
      apiKeysMap: expect.any(Map),
      errors: [],
      rule: decryptedRule1,
      rules: [],
      skipped: [],
      username: undefined,
    });
    expect(updateFn).toHaveBeenNthCalledWith(2, {
      apiKeysMap: expect.any(Map),
      errors: [],
      rule: decryptedRule2,
      rules: [],
      skipped: [],
      username: undefined,
    });
    expect(bulkMarkApiKeysForInvalidation).not.toHaveBeenCalled();
  });

  test('should call bulkMarkApiKeysForInvalidation if there are apiKeysToInvalidate', async () => {
    await bulkEditRules(rulesClientContext, {
      name: `rulesClient.bulkEdit`,
      updateFn: jest.fn().mockImplementation(({ apiKeysMap, rules }) => {
        rules.push(existingDecryptedRule);
        apiKeysMap.set('1', {
          oldApiKey: MOCK_API_KEY_1,
          oldApiKeyCreatedByUser: false,
        });
      }),
      shouldInvalidateApiKeys: true,
      requiredAuthOperation: ReadOperations.BulkEditParams,
      auditAction: RuleAuditAction.BULK_EDIT,
    });

    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
      { apiKeys: [MOCK_API_KEY_1] },
      logger,
      unsecuredSavedObjectsClient
    );
  });

  test('should return updated rules formatted for the public API', async () => {
    const result = await bulkEditRules(rulesClientContext, {
      name: `rulesClient.bulkEdit`,
      updateFn: jest.fn().mockImplementation(({ rules, skipped }) => {
        rules.push(existingDecryptedRule);
        skipped.push({
          id: 'skip-1',
          name: 'skip-1',
          skip_reason: 'RULE_NOT_MODIFIED' as BulkEditSkipReason,
        });
        skipped.push({
          id: 'skip-2',
          name: 'skip-2',
          skip_reason: 'RULE_NOT_MODIFIED' as BulkEditSkipReason,
        });
        skipped.push({
          id: 'skip-5',
          name: 'skip-5',
          skip_reason: 'RULE_NOT_MODIFIED' as BulkEditSkipReason,
        });
      }),
      shouldInvalidateApiKeys: false,
      requiredAuthOperation: ReadOperations.BulkEditParams,
      auditAction: RuleAuditAction.BULK_EDIT,
    });

    expect(result).toEqual({
      rules: [
        {
          ...existingRule.attributes,
          id: '1',
          actions: [],
          artifacts: {
            dashboards: [],
            investigation_guide: { blob: '' },
          },
          executionStatus: {
            lastExecutionDate: new Date(existingRule.attributes.executionStatus.lastExecutionDate),
            status: 'pending',
          },
          snoozeSchedule: [],
          systemActions: [],
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      ],
      errors: [],
      skipped: [
        { id: 'skip-1', name: 'skip-1', skip_reason: 'RULE_NOT_MODIFIED' as BulkEditSkipReason },
        { id: 'skip-2', name: 'skip-2', skip_reason: 'RULE_NOT_MODIFIED' as BulkEditSkipReason },
        { id: 'skip-5', name: 'skip-5', skip_reason: 'RULE_NOT_MODIFIED' as BulkEditSkipReason },
      ],
      total: 1,
    });
  });
});
