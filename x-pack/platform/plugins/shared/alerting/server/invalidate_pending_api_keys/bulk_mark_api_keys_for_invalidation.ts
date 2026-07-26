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
    if (apiKeys.length === 0) {
      return;
    }

    const apiKeysToInvalidate = apiKeys.map((key) => {
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
        `Failed to bulk mark list of API keys [${apiKeys
          .map((key) => `"${key}"`)
          .join(', ')}] for invalidation: ${e.message}`,
        {
          error: { stack_trace: e.stack },
        }
      );
    }
  });
};
