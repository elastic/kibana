/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { withSpan } from '@kbn/apm-utils';
import { isUiamCredential } from '@kbn/core-security-server';
import { API_KEY_PENDING_INVALIDATION_TYPE } from '..';

export const bulkMarkApiKeysForInvalidation = async (
  { apiKeys }: { apiKeys: string[] },
  logger: Logger,
  savedObjectsClient: SavedObjectsClientContract
): Promise<void> => {
  await withSpan({ name: 'bulkMarkApiKeysForInvalidation', type: 'rules' }, async () => {
    // Raw `essu_` values are user-created Cloud API keys stored as-is (no `base64(id:key)`
    // encoding and no key id). They are never managed by alerting, and every invalidation
    // call site is gated on `apiKeyCreatedByUser` — this filter is defense-in-depth so a
    // future caller cannot enqueue an undecodable invalidation entry.
    const decodableApiKeys = apiKeys.filter((key) => {
      if (isUiamCredential(key)) {
        logger.warn(
          'Skipping invalidation for a user-created UIAM API key; user-created API keys are not managed by alerting.'
        );
        return false;
      }
      return true;
    });

    if (decodableApiKeys.length === 0) {
      return;
    }

    const apiKeysToInvalidate = decodableApiKeys.map((key) => {
      let apiKeyId;
      let apiKeyValue;

      const [id, apiKey] = Buffer.from(key, 'base64').toString().split(':');

      if (apiKey && isUiamCredential(apiKey)) {
        apiKeyId = id;
        apiKeyValue = apiKey;
      } else {
        apiKeyId = id;
      }

      return {
        attributes: {
          apiKeyId,
          createdAt: new Date().toISOString(),
          ...(apiKeyValue ? { uiamApiKey: apiKeyValue } : {}),
        },
        type: API_KEY_PENDING_INVALIDATION_TYPE,
      };
    });

    try {
      await savedObjectsClient.bulkCreate(apiKeysToInvalidate);
    } catch (e) {
      logger.error(
        `Failed to bulk mark list of API keys [${decodableApiKeys
          .map((key) => `"${key}"`)
          .join(', ')}] for invalidation: ${e.message}`,
        {
          error: { stack_trace: e.stack },
        }
      );
    }
  });
};
