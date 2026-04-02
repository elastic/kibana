/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { isRevokedApiKey } from '@kbn/core-security-server';
import type { ApiKeyIdAndSOId, UiamApiKeyAndSOId } from './get_api_key_ids_to_invalidate';
import { invalidateAPIKeys, invalidateUiamAPIKeys } from './invalidate_api_keys';
import type { ApiKeyInvalidationFn, UiamApiKeyInvalidationFn } from '../invalidate_api_keys_task';

interface InvalidateApiKeysAndDeleteSO {
  apiKeyIdsToInvalidate: ApiKeyIdAndSOId[];
  uiamApiKeysToInvalidate?: UiamApiKeyAndSOId[];
  invalidateApiKeyFn?: ApiKeyInvalidationFn;
  invalidateUiamApiKeyFn?: UiamApiKeyInvalidationFn;
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectType: string;
}

export async function invalidateApiKeysAndDeletePendingApiKeySavedObject({
  apiKeyIdsToInvalidate,
  uiamApiKeysToInvalidate,
  invalidateApiKeyFn,
  invalidateUiamApiKeyFn,
  logger,
  savedObjectsClient,
  savedObjectType,
}: InvalidateApiKeysAndDeleteSO) {
  let totalInvalidated = 0;

  // ES APIKey invalidation
  if (apiKeyIdsToInvalidate.length > 0) {
    const ids = apiKeyIdsToInvalidate.map(({ apiKeyId }) => apiKeyId);
    const response = await invalidateAPIKeys({ ids }, invalidateApiKeyFn);
    if (response.apiKeysEnabled === true && response.result.error_count > 0) {
      logger.error(`Failed to invalidate API Keys [count="${ids.length}"]`);
    } else {
      await Promise.all(
        apiKeyIdsToInvalidate.map(async ({ id }) => {
          try {
            await savedObjectsClient.delete(savedObjectType, id);
            totalInvalidated++;
          } catch (err) {
            logger.error(`Failed to delete invalidated API key. Error: ${err.message}`);
          }
        })
      );
    }
  }

  // UIAM APIKey invalidation
  if (uiamApiKeysToInvalidate && uiamApiKeysToInvalidate.length > 0) {
    for (const { uiamApiKey, apiKeyId, id } of uiamApiKeysToInvalidate) {
      const response = await invalidateUiamAPIKeys(
        { uiamApiKey, apiKeyId },
        invalidateUiamApiKeyFn
      );

      if (response.apiKeysEnabled === true && response.result.error_count > 0) {
        if (isRevokedApiKey(response.result)) {
          logger.warn(
            `UIAM APIKey is already invalidated or missing, removing pending invalidation. ` +
              `Error: ${response.result.error_details?.map((d) => d.reason).join('; ')}`
          );
        } else {
          logger.error(
            `Failed to invalidate UIAM APIKey: ${response.result.error_details
              ?.map((d) => d.reason)
              .join('; ')}`
          );
          continue;
        }
      }

      try {
        await savedObjectsClient.delete(savedObjectType, id);
        totalInvalidated++;
      } catch (err) {
        logger.error(`Failed to delete invalidated UIAM API key. Error: ${err.message}`);
      }
    }
  }

  logger.debug(`Total invalidated API keys "${totalInvalidated}"`);
  return totalInvalidated;
}
