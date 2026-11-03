/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import { RulesClient } from '../../../../rules_client/rules_client';
import { getRulesClientMockParams } from '../../../../test_utils';
import { getBeforeSetup } from '../../../../rules_client/tests/lib';
import { bulkMarkApiKeysForInvalidation } from '../../../../api_keys/invalidation/bulk_mark_api_keys_for_invalidation';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';

jest.mock('../../../../api_keys/invalidation/bulk_mark_api_keys_for_invalidation', () => ({
  bulkMarkApiKeysForInvalidation: jest.fn(),
}));

jest.mock('../../../../lib/rule_gaps/soft_delete/soft_delete_gaps');

jest.mock(
  '../../../../rules_client/lib/siem_legacy_actions/transform_and_delete_legacy_actions',
  () => ({
    deleteLegacyActionsForRules: jest.fn(),
  })
);

const bulkMarkMock = bulkMarkApiKeysForInvalidation as jest.Mock;

const encode = (value: string) => Buffer.from(value).toString('base64');
const ES_KEY = encode('es-id:es-secret');
const UIAM_KEY = encode('uiam-id:essu_secret');

const eventLogClient = eventLogClientMock.create();

const {
  rulesClientParams,
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  encryptedSavedObjects,
} = getRulesClientMockParams({
  invalidateApiKeyNow: jest.fn(),
  eventLogger: eventLoggerMock.create(),
});

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry, eventLogClient);
});

describe('delete() API key invalidation characterization', () => {
  let rulesClient: RulesClient;

  const ruleAttributes = {
    name: 'rule-name',
    alertTypeId: 'myType',
    consumer: 'myApp',
    schedule: { interval: '10s' },
    params: {},
    scheduledTaskId: 'task-123',
    actions: [],
  };

  const mockDecryptedRule = (attributes: Record<string, unknown>) => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: { ...ruleAttributes, ...attributes },
      references: [],
    });
  };

  beforeEach(() => {
    rulesClient = new RulesClient(rulesClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValue({
      id: '1',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: ruleAttributes,
      references: [],
    });
    unsecuredSavedObjectsClient.delete.mockResolvedValue({ success: true });
  });

  test.each<[string, Record<string, unknown>, string[] | null]>([
    [
      'framework UIAM-only rule',
      { apiKey: null, uiamApiKey: UIAM_KEY, apiKeyCreatedByUser: false },
      [UIAM_KEY],
    ],
    [
      'apiKeyCreatedByUser=null with ES + UIAM',
      { apiKey: ES_KEY, uiamApiKey: UIAM_KEY, apiKeyCreatedByUser: null },
      [ES_KEY, UIAM_KEY],
    ],
    [
      'user-created base64 UIAM key',
      { apiKey: null, uiamApiKey: UIAM_KEY, apiKeyCreatedByUser: true },
      null,
    ],
    [
      'user-created raw essu_ key',
      { apiKey: null, uiamApiKey: 'essu_raw', apiKeyCreatedByUser: true },
      null,
    ],
  ])('queued path: %s', async (_title, attributes, expected) => {
    mockDecryptedRule(attributes);

    await rulesClient.delete({ id: '1' });

    expect(rulesClientParams.invalidateApiKeyNow).not.toHaveBeenCalled();
    if (expected === null) {
      expect(bulkMarkMock).not.toHaveBeenCalled();
      return;
    }
    expect(bulkMarkMock).toHaveBeenCalledTimes(1);
    expect(bulkMarkMock).toHaveBeenCalledWith(
      { apiKeys: expected },
      rulesClientParams.logger,
      unsecuredSavedObjectsClient
    );
  });

  test('invalidateApiKeyNow=true passes a null apiKey through for a UIAM-only rule', async () => {
    mockDecryptedRule({ apiKey: null, uiamApiKey: UIAM_KEY, apiKeyCreatedByUser: false });

    await rulesClient.delete({ id: '1', invalidateApiKeyNow: true });

    expect(bulkMarkMock).not.toHaveBeenCalled();
    expect(rulesClientParams.invalidateApiKeyNow).toHaveBeenCalledTimes(1);
    expect(rulesClientParams.invalidateApiKeyNow).toHaveBeenCalledWith({
      ruleName: 'rule-name',
      apiKey: null,
      uiamApiKey: UIAM_KEY,
    });
  });

  test('invalidateApiKeyNow=true without a context implementation warns and queues instead', async () => {
    const clientWithoutSync = new RulesClient({
      ...rulesClientParams,
      invalidateApiKeyNow: undefined,
    });
    mockDecryptedRule({ apiKey: ES_KEY, uiamApiKey: UIAM_KEY, apiKeyCreatedByUser: false });

    await clientWithoutSync.delete({ id: '1', invalidateApiKeyNow: true });

    expect(rulesClientParams.logger.warn).toHaveBeenCalledWith(
      'delete(): invalidateApiKeyNow=true requested for rule 1 but the rules client context does not support synchronous invalidation; falling back to queued invalidation.'
    );
    expect(bulkMarkMock).toHaveBeenCalledTimes(1);
    expect(bulkMarkMock).toHaveBeenCalledWith(
      { apiKeys: [ES_KEY, UIAM_KEY] },
      rulesClientParams.logger,
      unsecuredSavedObjectsClient
    );
  });

  test('invalidates nothing when the rule cannot be decrypted, even with invalidateApiKeyNow=true', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValue(new Error('Fail'));

    await rulesClient.delete({ id: '1', invalidateApiKeyNow: true });

    expect(unsecuredSavedObjectsClient.delete).toHaveBeenCalled();
    expect(rulesClientParams.invalidateApiKeyNow).not.toHaveBeenCalled();
    expect(bulkMarkMock).not.toHaveBeenCalled();
  });

  test('invalidates nothing when the rule delete fails', async () => {
    mockDecryptedRule({ apiKey: ES_KEY, uiamApiKey: UIAM_KEY, apiKeyCreatedByUser: false });
    unsecuredSavedObjectsClient.delete.mockRejectedValueOnce(new Error('Fail'));

    await expect(rulesClient.delete({ id: '1' })).rejects.toThrow('Fail');

    expect(bulkMarkMock).not.toHaveBeenCalled();
  });
});
