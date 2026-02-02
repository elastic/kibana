/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { withSpan } from '@kbn/apm-utils';
import { API_KEY_PENDING_INVALIDATION_TYPE } from '..';

interface BulkInvalidateAPIKeyParams {
  apiKeys: string[];
  uiamApiKeys?: { uiamApiKey: string; uiamApiKeyId: string }[];
}

export const bulkMarkApiKeysForInvalidation = async (
  { apiKeys, uiamApiKeys = [] }: BulkInvalidateAPIKeyParams,
  logger: Logger,
  savedObjectsClient: SavedObjectsClientContract
): Promise<void> => {
  await withSpan({ name: 'bulkMarkApiKeysForInvalidation', type: 'rules' }, async () => {
    if (apiKeys.length === 0 && uiamApiKeys.length === 0) {
      return;
    }

    try {
      const combinedApiKeys: { id: string; uiamApiKey?: string }[] = apiKeys.map((apiKey) => ({
        id: Buffer.from(apiKey, 'base64').toString().split(':')[0],
      }));
      uiamApiKeys.forEach(({ uiamApiKey, uiamApiKeyId }) => {
        combinedApiKeys.push({
          id: uiamApiKeyId,
          uiamApiKey,
        });
      });

      await savedObjectsClient.bulkCreate(
        combinedApiKeys.map(({ id, uiamApiKey }) => ({
          attributes: {
            apiKeyId: id,
            createdAt: new Date().toISOString(),
            ...(uiamApiKey ? { uiamApiKey } : {}),
          },
          type: API_KEY_PENDING_INVALIDATION_TYPE,
        }))
      );
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
