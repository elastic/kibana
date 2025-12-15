/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ApiKeyIdAndSOId } from './get_api_key_ids_to_invalidate';
import { invalidateAPIKeys } from './invalidate_api_keys';
import type { ApiKeyInvalidationFn } from '../invalidate_api_keys_task';

interface InvalidateApiKeysAndDeleteSO {
  apiKeyIdsToInvalidate: ApiKeyIdAndSOId[];
  invalidateApiKeyFn?: ApiKeyInvalidationFn;
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectType: string;
}

export async function invalidateApiKeysAndDeletePendingApiKeySavedObject({
  apiKeyIdsToInvalidate,
  invalidateApiKeyFn,
  logger,
  savedObjectsClient,
  savedObjectType,
}: InvalidateApiKeysAndDeleteSO) {
  let totalInvalidated = 0;
  if (apiKeyIdsToInvalidate.length > 0) {
    const ids = apiKeyIdsToInvalidate.map(({ apiKeyId }) => apiKeyId);
    const response = await invalidateAPIKeys({ ids }, invalidateApiKeyFn);
    if (response.apiKeysEnabled === true && response.result.error_count > 0) {
      logger.error(`Failed to invalidate API Keys [count="${ids.length}"]`);
    } else {
      await Promise.all(
        apiKeyIdsToInvalidate.map(async ({ id, apiKeyId }) => {
          try {
            await savedObjectsClient.delete(savedObjectType, id);
            totalInvalidated++;
          } catch (err) {
            logger.error(
              `Failed to delete invalidated API key "${apiKeyId}". Error: ${err.message}`
            );
          }
        })
      );
    }
  }
  logger.debug(`Total invalidated API keys "${totalInvalidated}"`);
  return totalInvalidated;
}
