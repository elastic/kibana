/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { RulesClient } from '../../../../rules_client/rules_client';
import { getRulesClientMockParams } from '../../../../test_utils';
import { getBeforeSetup, setGlobalDate } from '../../../../rules_client/tests/lib';
import { bulkMarkApiKeysForInvalidation } from '../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';

jest.mock('../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation', () => ({
  bulkMarkApiKeysForInvalidation: jest.fn(),
}));

const bulkMarkMock = bulkMarkApiKeysForInvalidation as jest.Mock;

const encode = (value: string) => Buffer.from(value).toString('base64');

const OLD_ES_KEY = encode('old-es-id:old-es-secret');
const OLD_UIAM_KEY = encode('old-uiam-id:essu_old');

const {
  rulesClientParams,
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  encryptedSavedObjects,
} = getRulesClientMockParams();

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
});

setGlobalDate();

describe('updateRuleApiKey() API key invalidation characterization', () => {
  let rulesClient: RulesClient;

  const ruleAttributes = {
    name: 'rule-name',
    revision: 0,
    schedule: { interval: '10s' },
    alertTypeId: 'myType',
    consumer: 'myApp',
    enabled: true,
    actions: [],
  };

  const mockDecryptedRule = (attributes: Record<string, unknown>) => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: { ...ruleAttributes, ...attributes },
      version: '123',
      references: [],
    });
  };

  const mockUserApiKeyAuth = (uiamResult: { id?: string; name: string; api_key: string }) => {
    rulesClientParams.isAuthenticationTypeAPIKey.mockReturnValue(true);
    rulesClientParams.getAuthenticationAPIKey.mockReturnValueOnce({
      apiKeysEnabled: true,
      uiamResult,
    });
  };

  beforeEach(() => {
    rulesClient = new RulesClient(rulesClientParams);
  });

  describe('write failure path', () => {
    beforeEach(() => {
      unsecuredSavedObjectsClient.create.mockRejectedValueOnce(new Error('Fail'));
    });

    test('queues the new framework ES and UIAM keys, ES first, and never the old keys', async () => {
      mockDecryptedRule({
        apiKey: OLD_ES_KEY,
        uiamApiKey: OLD_UIAM_KEY,
        apiKeyCreatedByUser: false,
      });
      rulesClientParams.createAPIKey.mockResolvedValueOnce({
        apiKeysEnabled: true,
        result: { id: 'new-es-id', name: 'n', api_key: 'new-es-secret' },
        uiamResult: { id: 'new-uiam-id', name: 'n', api_key: 'essu_new' },
      });

      await expect(rulesClient.updateRuleApiKey({ id: '1' })).rejects.toThrow('Fail');

      expect(bulkMarkMock).toHaveBeenCalledTimes(1);
      expect(bulkMarkMock).toHaveBeenCalledWith(
        { apiKeys: [encode('new-es-id:new-es-secret'), encode('new-uiam-id:essu_new')] },
        rulesClientParams.logger,
        unsecuredSavedObjectsClient
      );
    });

    test('does not queue a user-created base64(id:essu_) UIAM key', async () => {
      mockDecryptedRule({ apiKey: null, uiamApiKey: OLD_UIAM_KEY, apiKeyCreatedByUser: true });
      mockUserApiKeyAuth({ id: 'user-uiam-id', name: 'n', api_key: 'essu_user' });

      await expect(rulesClient.updateRuleApiKey({ id: '1' })).rejects.toThrow('Fail');

      const written = unsecuredSavedObjectsClient.create.mock.calls[0][1];
      expect(written).toMatchObject({
        apiKey: null,
        apiKeyCreatedByUser: true,
        uiamApiKey: encode('user-uiam-id:essu_user'),
      });
      expect(bulkMarkMock).not.toHaveBeenCalled();
    });

    test('does not queue a user-created raw essu_ UIAM key', async () => {
      mockDecryptedRule({ apiKey: null, uiamApiKey: 'essu_user_raw', apiKeyCreatedByUser: true });
      mockUserApiKeyAuth({ name: 'n', api_key: 'essu_user_raw' });

      await expect(rulesClient.updateRuleApiKey({ id: '1' })).rejects.toThrow('Fail');

      expect(bulkMarkMock).not.toHaveBeenCalled();
    });

    test('does not queue a user-created ES key', async () => {
      mockDecryptedRule({ apiKey: OLD_ES_KEY, apiKeyCreatedByUser: true });
      rulesClientParams.isAuthenticationTypeAPIKey.mockReturnValue(true);
      rulesClientParams.getAuthenticationAPIKey.mockReturnValueOnce({
        apiKeysEnabled: true,
        result: { id: 'user-es-id', name: 'n', api_key: 'user-es-secret' },
      });

      await expect(rulesClient.updateRuleApiKey({ id: '1' })).rejects.toThrow('Fail');

      expect(bulkMarkMock).not.toHaveBeenCalled();
    });
  });

  describe('success path', () => {
    test('queues only the old UIAM key of a framework UIAM-only rule', async () => {
      mockDecryptedRule({ apiKey: null, uiamApiKey: OLD_UIAM_KEY, apiKeyCreatedByUser: false });
      rulesClientParams.createAPIKey.mockResolvedValueOnce({
        apiKeysEnabled: true,
        uiamResult: { id: 'new-uiam-id', name: 'n', api_key: 'essu_new' },
      });

      await rulesClient.updateRuleApiKey({ id: '1' });

      expect(bulkMarkMock).toHaveBeenCalledTimes(1);
      expect(bulkMarkMock).toHaveBeenCalledWith(
        { apiKeys: [OLD_UIAM_KEY] },
        rulesClientParams.logger,
        unsecuredSavedObjectsClient
      );
    });

    test('does not queue old user-created ES or UIAM keys', async () => {
      mockDecryptedRule({
        apiKey: OLD_ES_KEY,
        uiamApiKey: OLD_UIAM_KEY,
        apiKeyCreatedByUser: true,
      });
      mockUserApiKeyAuth({ id: 'user-uiam-id', name: 'n', api_key: 'essu_user' });

      await rulesClient.updateRuleApiKey({ id: '1' });

      expect(bulkMarkMock).not.toHaveBeenCalled();
    });

    test('queues old keys when apiKeyCreatedByUser is undefined on the stored rule', async () => {
      mockDecryptedRule({ apiKey: OLD_ES_KEY, uiamApiKey: OLD_UIAM_KEY });
      rulesClientParams.createAPIKey.mockResolvedValueOnce({
        apiKeysEnabled: true,
        result: { id: 'new-es-id', name: 'n', api_key: 'new-es-secret' },
      });

      await rulesClient.updateRuleApiKey({ id: '1' });

      expect(bulkMarkMock).toHaveBeenCalledTimes(1);
      expect(bulkMarkMock).toHaveBeenCalledWith(
        { apiKeys: [OLD_ES_KEY, OLD_UIAM_KEY] },
        rulesClientParams.logger,
        unsecuredSavedObjectsClient
      );
    });
  });

  test('on a 409 retry, queues the first attempt new keys and then the old keys after the successful attempt', async () => {
    mockDecryptedRule({ apiKey: OLD_ES_KEY, uiamApiKey: OLD_UIAM_KEY, apiKeyCreatedByUser: false });
    rulesClientParams.createAPIKey
      .mockResolvedValueOnce({
        apiKeysEnabled: true,
        result: { id: 'attempt-1-es', name: 'n', api_key: 's1' },
        uiamResult: { id: 'attempt-1-uiam', name: 'n', api_key: 'essu_1' },
      })
      .mockResolvedValueOnce({
        apiKeysEnabled: true,
        result: { id: 'attempt-2-es', name: 'n', api_key: 's2' },
      });
    unsecuredSavedObjectsClient.create
      .mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(RULE_SAVED_OBJECT_TYPE, '1')
      )
      .mockResolvedValueOnce({
        id: '1',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: ruleAttributes,
        references: [],
      });

    await rulesClient.updateRuleApiKey({ id: '1' });

    expect(bulkMarkMock).toHaveBeenCalledTimes(2);
    expect(bulkMarkMock).toHaveBeenNthCalledWith(
      1,
      { apiKeys: [encode('attempt-1-es:s1'), encode('attempt-1-uiam:essu_1')] },
      rulesClientParams.logger,
      unsecuredSavedObjectsClient
    );
    expect(bulkMarkMock).toHaveBeenNthCalledWith(
      2,
      { apiKeys: [OLD_ES_KEY, OLD_UIAM_KEY] },
      rulesClientParams.logger,
      unsecuredSavedObjectsClient
    );
  });
});
