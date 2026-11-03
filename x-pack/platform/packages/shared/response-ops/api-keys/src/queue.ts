/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import type { InvalidationTarget } from './stored_keys';

/** Returned per target, so callers queueing a batch learn which keys were registered. */
export type QueueResult = { success: true } | { success: false; message: string };

/**
 * Writes one pending-invalidation saved object per target. The plugin's invalidation task
 * invalidates them later. Never throws; failures are logged and returned.
 */
export const queueInvalidationTargets = async (
  targets: InvalidationTarget[],
  {
    type,
    savedObjectsClient,
    logger,
  }: { type: string; savedObjectsClient: SavedObjectsClientContract; logger: Logger }
): Promise<QueueResult[]> => {
  if (targets.length === 0) {
    return [];
  }

  const createdAt = new Date().toISOString();
  const objects = targets.map(({ apiKeyId, uiamApiKey, taskId, taskStartedAt }) => ({
    type,
    attributes: {
      apiKeyId,
      createdAt,
      ...(uiamApiKey ? { uiamApiKey } : {}),
      ...(taskId && taskStartedAt ? { taskId, taskStartedAt } : {}),
    },
  }));

  let response;
  try {
    response = await savedObjectsClient.bulkCreate(objects);
  } catch (e) {
    const { message, stack } = e as Error;
    logger.error(
      `Failed to bulk mark list of API keys [${targets
        .map(({ apiKeyId }) => `"${apiKeyId}"`)
        .join(', ')}] for invalidation: ${message}`,
      { error: { stack_trace: stack } }
    );
    return targets.map((): QueueResult => ({ success: false, message }));
  }

  return targets.map(({ apiKeyId }, index): QueueResult => {
    const created = response.saved_objects[index];
    if (created && !isSavedObjectErrorResult(created)) {
      return { success: true };
    }
    const message = created ? created.error.message : 'Saved object was not returned by bulkCreate';
    logger.error(`Failed to mark API key "${apiKeyId}" for invalidation: ${message}`);
    return { success: false, message };
  });
};
