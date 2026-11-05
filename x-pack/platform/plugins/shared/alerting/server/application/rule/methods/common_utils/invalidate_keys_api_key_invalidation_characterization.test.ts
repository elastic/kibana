/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { bulkMarkApiKeysForInvalidation } from '../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import type { RulesClientContext } from '../../../../rules_client/types';
import { invalidateKeys, type ApiKeyEntry } from './invalidate_keys';

jest.mock('../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation', () => ({
  bulkMarkApiKeysForInvalidation: jest.fn(),
}));

const bulkMarkMock = bulkMarkApiKeysForInvalidation as jest.Mock;

const encode = (value: string) => Buffer.from(value).toString('base64');
const ES_KEY = encode('es-id:es-secret');
const UIAM_KEY = encode('uiam-id:essu_secret');
const RAW_UIAM_KEY = 'essu_raw_user_key';

describe('invalidateKeys characterization', () => {
  const logger = loggingSystemMock.create().get();
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const context = { logger, unsecuredSavedObjectsClient } as unknown as RulesClientContext;

  beforeEach(() => {
    bulkMarkMock.mockReset();
  });

  test.each<[string, ApiKeyEntry, string[] | null]>([
    [
      'framework ES + UIAM (createdByUser=false)',
      { apiKey: ES_KEY, uiamApiKey: UIAM_KEY, apiKeyCreatedByUser: false },
      [ES_KEY, UIAM_KEY],
    ],
    [
      'framework ES + UIAM (createdByUser=null)',
      { apiKey: ES_KEY, uiamApiKey: UIAM_KEY, apiKeyCreatedByUser: null },
      [ES_KEY, UIAM_KEY],
    ],
    [
      'framework UIAM only',
      { apiKey: null, uiamApiKey: UIAM_KEY, apiKeyCreatedByUser: false },
      [UIAM_KEY],
    ],
    [
      'raw essu_ with createdByUser=false is passed through',
      { apiKey: null, uiamApiKey: RAW_UIAM_KEY, apiKeyCreatedByUser: false },
      [RAW_UIAM_KEY],
    ],
    [
      'user-created ES + base64 UIAM',
      { apiKey: ES_KEY, uiamApiKey: UIAM_KEY, apiKeyCreatedByUser: true },
      null,
    ],
    [
      'user-created raw essu_',
      { apiKey: null, uiamApiKey: RAW_UIAM_KEY, apiKeyCreatedByUser: true },
      null,
    ],
    ['no keys', { apiKey: null, uiamApiKey: null, apiKeyCreatedByUser: false }, null],
  ])('%s', async (_title, entry, expected) => {
    await invalidateKeys([entry], context);

    if (expected === null) {
      expect(bulkMarkMock).not.toHaveBeenCalled();
      return;
    }
    expect(bulkMarkMock).toHaveBeenCalledTimes(1);
    expect(bulkMarkMock).toHaveBeenCalledWith(
      { apiKeys: expected },
      logger,
      unsecuredSavedObjectsClient
    );
  });

  test('flattens entries in order (apiKey then uiamApiKey per entry) and de-duplicates by first occurrence', async () => {
    const otherEsKey = encode('es-id-2:es-secret-2');
    const entries = new Map<string, ApiKeyEntry>([
      ['1', { apiKey: ES_KEY, uiamApiKey: UIAM_KEY, apiKeyCreatedByUser: false }],
      ['2', { apiKey: otherEsKey, uiamApiKey: null, apiKeyCreatedByUser: true }],
      ['3', { apiKey: otherEsKey, uiamApiKey: ES_KEY, apiKeyCreatedByUser: false }],
    ]);

    await invalidateKeys(entries.values(), context);

    expect(bulkMarkMock).toHaveBeenCalledTimes(1);
    expect(bulkMarkMock).toHaveBeenCalledWith(
      { apiKeys: [ES_KEY, UIAM_KEY, otherEsKey] },
      logger,
      unsecuredSavedObjectsClient
    );
  });
});
