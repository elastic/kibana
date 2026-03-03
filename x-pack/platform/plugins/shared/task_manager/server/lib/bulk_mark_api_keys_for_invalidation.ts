/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { INVALIDATE_API_KEY_SO_NAME } from '../saved_objects';

export interface BulkMarkApiKeysForInvalidationOpts {
  apiKeyIds: string[];
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
}
export const bulkMarkApiKeysForInvalidation = async (opts: BulkMarkApiKeysForInvalidationOpts) => {
  const { apiKeyIds, logger, savedObjectsClient } = opts;
  if (apiKeyIds.length === 0) {
    return;
  }

  try {
    await savedObjectsClient.bulkCreate(
      apiKeyIds.map((apiKeyId) => ({
        attributes: {
          apiKeyId,
          createdAt: new Date().toISOString(),
        },
        type: INVALIDATE_API_KEY_SO_NAME,
      }))
    );
  } catch (e) {
    logger.error(`Failed to bulk mark ${apiKeyIds.length} API keys for invalidation: ${e.message}`);
  }
};
