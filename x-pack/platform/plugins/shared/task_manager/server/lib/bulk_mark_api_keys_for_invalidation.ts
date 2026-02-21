/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { INVALIDATE_API_KEY_SO_NAME } from '../saved_objects';

export interface ApiKeyToMarkForInvalidation {
  apiKeyId: string;
  uiamApiKey?: string;
}

export interface BulkMarkApiKeysForInvalidationOpts {
  /** List of API keys to mark (ES and/or UIAM; include uiamApiKey when invalidating a UIAM key) */
  apiKeysToInvalidate: ApiKeyToMarkForInvalidation[];
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
}

export const bulkMarkApiKeysForInvalidation = async (opts: BulkMarkApiKeysForInvalidationOpts) => {
  const { apiKeysToInvalidate, logger, savedObjectsClient } = opts;
  if (apiKeysToInvalidate.length === 0) {
    return;
  }

  try {
    await savedObjectsClient.bulkCreate(
      apiKeysToInvalidate.map(({ apiKeyId, uiamApiKey }) => ({
        attributes: {
          apiKeyId,
          createdAt: new Date().toISOString(),
          ...(uiamApiKey ? { uiamApiKey } : {}),
        },
        type: INVALIDATE_API_KEY_SO_NAME,
      }))
    );
  } catch (e) {
    logger.error(
      `Failed to bulk mark ${apiKeysToInvalidate.length} API keys for invalidation: ${e.message}`
    );
  }
};
