/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { RulesClient } from '../../../../rules_client/rules_client';
import { getRulesClientMockParams } from '../../../../test_utils';
import { RecoveredActionGroup } from '../../../../../common';
import { getBeforeSetup, setGlobalDate } from '../../../../rules_client/tests/lib';
import { bulkMarkApiKeysForInvalidation } from '../../../../api_keys/invalidation/bulk_mark_api_keys_for_invalidation';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import type { RawRule } from '../../../../types';
import { bulkMigrateLegacyActions } from '../../../../rules_client/lib';

jest.mock('../../../../api_keys/invalidation/bulk_mark_api_keys_for_invalidation', () => ({
  bulkMarkApiKeysForInvalidation: jest.fn(),
}));

jest.mock('../../../../rules_client/lib/siem_legacy_actions/migrate_legacy_actions', () => ({
  bulkMigrateLegacyActions: jest.fn(),
}));

jest.mock(
  '../../../../rules_client/lib/siem_legacy_actions/transform_and_delete_legacy_actions',
  () => ({
    deleteLegacyActionsForRules: jest.fn(),
  })
);

jest.mock('../get_schedule_frequency', () => ({
  validateScheduleLimit: jest.fn(),
}));

const { validateScheduleLimit } = jest.requireMock('../get_schedule_frequency');

const bulkMarkMock = bulkMarkApiKeysForInvalidation as jest.Mock;

const encode = (value: string) => Buffer.from(value).toString('base64');

const OLD_ES_KEY = encode('old-es-id:old-es-secret');
const OLD_UIAM_KEY = encode('old-uiam-id:essu_old');
const NEW_ES_KEY = encode('new-es-id:new-es-secret');
const NEW_UIAM_KEY = encode('new-uiam-id:essu_new');

const createAPIKeyMock = jest.fn();
const isAuthenticationTypeApiKeyMock = jest.fn();
const getAuthenticationApiKeyMock = jest.fn();

const {
  rulesClientParams,
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  encryptedSavedObjects,
  authorization,
} = getRulesClientMockParams({
  kibanaVersion: 'v8.2.0',
  createAPIKey: createAPIKeyMock,
  isAuthenticationTypeAPIKey: isAuthenticationTypeApiKeyMock,
  getAuthenticationAPIKey: getAuthenticationApiKeyMock,
});

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
  (bulkMigrateLegacyActions as jest.Mock).mockReset().mockResolvedValue([]);
});

setGlobalDate();

describe('bulkEdit() API key invalidation characterization', () => {
  let rulesClient: RulesClient;

  const baseAttributes = {
    enabled: true,
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
    executionStatus: { lastExecutionDate: '2019-02-12T21:01:22.479Z', status: 'pending' },
    params: {},
    throttle: null,
    notifyWhen: null,
    actions: [],
    name: 'my rule name',
    revision: 0,
  };

  const mockRules = (attributes: Record<string, unknown>) => {
    const rule = {
      id: '1',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: { ...baseAttributes, ...attributes },
      references: [],
      version: '123',
    } as unknown as SavedObject<RawRule>;
    encryptedSavedObjects.createPointInTimeFinderDecryptedAsInternalUser = jest
      .fn()
      .mockResolvedValue({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [rule] };
        },
      });
    return rule;
  };

  const scheduleOperations = [
    { field: 'schedule' as const, operation: 'set' as const, value: { interval: '2m' } },
  ];
  const tagsOperations = [{ field: 'tags' as const, operation: 'add' as const, value: ['bar'] }];

  const expectBulkMarkCalledOnceWith = (apiKeys: string[]) => {
    expect(bulkMarkMock).toHaveBeenCalledTimes(1);
    expect(bulkMarkMock).toHaveBeenCalledWith(
      { apiKeys },
      rulesClientParams.logger,
      unsecuredSavedObjectsClient
    );
  };

  beforeEach(async () => {
    rulesClient = new RulesClient(rulesClientParams);

    const actionsClient =
      (await rulesClientParams.getActionsClient()) as jest.Mocked<ActionsClient>;
    actionsClient.getBulk.mockResolvedValue([]);
    actionsClient.isSystemAction.mockReturnValue(false);
    rulesClientParams.getActionsClient.mockResolvedValue(actionsClient);
    rulesClientParams.isSystemAction.mockReturnValue(false);

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

    ruleTypeRegistry.get.mockReturnValue({
      id: 'myType',
      name: 'Test',
      actionGroups: [{ id: 'default', name: 'Default' }],
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

  describe('schedule-limit rejection path', () => {
    beforeEach(() => {
      validateScheduleLimit.mockResolvedValue({ interval: 1, intervalAvailable: 0 });
    });

    test('queues new framework keys UIAM first, then ES, and never the old keys', async () => {
      mockRules({ apiKey: OLD_ES_KEY, uiamApiKey: OLD_UIAM_KEY, apiKeyCreatedByUser: false });
      createAPIKeyMock.mockResolvedValueOnce({
        apiKeysEnabled: true,
        result: { id: 'new-es-id', name: 'n', api_key: 'new-es-secret' },
        uiamResult: { id: 'new-uiam-id', name: 'n', api_key: 'essu_new' },
      });

      const result = await rulesClient.bulkEdit({ filter: '', operations: scheduleOperations });

      expect(unsecuredSavedObjectsClient.bulkCreate).not.toHaveBeenCalled();
      expect(result.errors).toHaveLength(1);
      expectBulkMarkCalledOnceWith([NEW_UIAM_KEY, NEW_ES_KEY]);
    });

    test('queues a new user-created ES key because newApiKeyCreatedByUser is not checked (current behavior)', async () => {
      mockRules({ apiKey: OLD_ES_KEY, apiKeyCreatedByUser: true });
      isAuthenticationTypeApiKeyMock.mockReturnValue(true);
      getAuthenticationApiKeyMock.mockReturnValue({
        apiKeysEnabled: true,
        result: { id: 'user-es-id', name: 'n', api_key: 'user-es-secret' },
      });

      await rulesClient.bulkEdit({ filter: '', operations: scheduleOperations });

      expect(getAuthenticationApiKeyMock).toHaveBeenCalledWith(
        'Alerting: myType/my rule name-user-created'
      );
      expectBulkMarkCalledOnceWith([encode('user-es-id:user-es-secret')]);
    });

    test('queues a new user-created base64(id:essu_) UIAM key because newApiKeyCreatedByUser is not checked (current behavior)', async () => {
      mockRules({ apiKey: null, uiamApiKey: OLD_UIAM_KEY, apiKeyCreatedByUser: true });
      isAuthenticationTypeApiKeyMock.mockReturnValue(true);
      getAuthenticationApiKeyMock.mockReturnValue({
        apiKeysEnabled: true,
        uiamResult: { id: 'user-uiam-id', name: 'n', api_key: 'essu_user' },
      });

      await rulesClient.bulkEdit({ filter: '', operations: scheduleOperations });

      expectBulkMarkCalledOnceWith([encode('user-uiam-id:essu_user')]);
    });

    test('passes a new user-created raw essu_ key to bulkMarkApiKeysForInvalidation (current behavior)', async () => {
      mockRules({ apiKey: null, uiamApiKey: 'essu_user_raw', apiKeyCreatedByUser: true });
      isAuthenticationTypeApiKeyMock.mockReturnValue(true);
      getAuthenticationApiKeyMock.mockReturnValue({
        apiKeysEnabled: true,
        uiamResult: { name: 'n', api_key: 'essu_user_raw' },
      });

      await rulesClient.bulkEdit({ filter: '', operations: scheduleOperations });

      expectBulkMarkCalledOnceWith(['essu_user_raw']);
    });
  });

  describe('save path', () => {
    beforeEach(() => {
      mockRules({ apiKey: OLD_ES_KEY, uiamApiKey: OLD_UIAM_KEY, apiKeyCreatedByUser: false });
      createAPIKeyMock.mockResolvedValueOnce({
        apiKeysEnabled: true,
        result: { id: 'new-es-id', name: 'n', api_key: 'new-es-secret' },
        uiamResult: { id: 'new-uiam-id', name: 'n', api_key: 'essu_new' },
      });
    });

    test('queues the old keys, ES first, when the rule is saved', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: { ...baseAttributes, tags: ['foo', 'bar'] },
            references: [],
          },
        ],
      });

      await rulesClient.bulkEdit({ filter: '', operations: tagsOperations });

      expectBulkMarkCalledOnceWith([OLD_ES_KEY, OLD_UIAM_KEY]);
    });

    test('queues the new keys, ES first, when the rule row fails to save', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: baseAttributes,
            references: [],
            error: { error: 'failure', statusCode: 500, message: 'failure' },
          },
        ],
      });

      await rulesClient.bulkEdit({ filter: '', operations: tagsOperations });

      expectBulkMarkCalledOnceWith([NEW_ES_KEY, NEW_UIAM_KEY]);
    });

    test('queues the new keys, UIAM first, when bulkCreate throws', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockRejectedValue(new Error('Fail'));

      await expect(
        rulesClient.bulkEdit({ filter: '', operations: tagsOperations })
      ).rejects.toThrow('Fail');

      expectBulkMarkCalledOnceWith([NEW_UIAM_KEY, NEW_ES_KEY]);
    });
  });
});
