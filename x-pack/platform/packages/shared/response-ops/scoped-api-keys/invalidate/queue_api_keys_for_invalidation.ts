/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ApiKeyInvalidationTarget } from './get_api_key_invalidation_targets';

export interface QueueApiKeysForInvalidationDeps {
  savedObjectsClient: SavedObjectsClientContract;
  /** The consumer's pending-invalidation saved object type. */
  type: string;
  logger: Logger;
}

export interface QueuedApiKeyInvalidation extends ApiKeyInvalidationTarget {
  /** Extra attributes for the consumer's own saved object type. */
  attributes?: Record<string, string>;
}

export type QueueApiKeyResult = { success: true } | { success: false; message: string };

/**
 * Writes API keys to the consumer's pending-invalidation queue, read later by `runInvalidate`.
 * Never throws; returns whether each entry was written.
 */
export const queueApiKeysForInvalidation = async (
  { savedObjectsClient, type, logger }: QueueApiKeysForInvalidationDeps,
  entries: QueuedApiKeyInvalidation[]
): Promise<QueueApiKeyResult[]> => {
  if (entries.length === 0) {
    return [];
  }

  const createdAt = new Date().toISOString();
  try {
    const { saved_objects: savedObjects } = await savedObjectsClient.bulkCreate(
      entries.map(({ apiKeyId, uiamApiKey, attributes }) => ({
        type,
        attributes: {
          apiKeyId,
          createdAt,
          ...(uiamApiKey ? { uiamApiKey } : {}),
          ...attributes,
        },
      }))
    );
    return entries.map(({ apiKeyId }, index): QueueApiKeyResult => {
      const created = savedObjects[index];
      const message = !created
        ? 'Saved object was not returned by bulkCreate'
        : 'error' in created && created.error
        ? created.error.message
        : undefined;
      if (message === undefined) {
        return { success: true };
      }
      logger.error(`Failed to mark API key "${apiKeyId}" for invalidation: ${message}`);
      return { success: false, message };
    });
  } catch (e) {
    const message = e?.message;
    logger.error(
      `Failed to bulk mark list of API keys [${entries
        .map(({ apiKeyId }) => `"${apiKeyId}"`)
        .join(', ')}] for invalidation: ${message}`,
      { error: { stack_trace: e?.stack } }
    );
    return entries.map((): QueueApiKeyResult => ({ success: false, message }));
  }
};
