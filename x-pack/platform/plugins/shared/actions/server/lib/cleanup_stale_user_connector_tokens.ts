/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { UserConnectorToken } from '../types';
import { USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE } from '../constants/saved_objects';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function cleanupStaleUserConnectorTokens(
  unsecuredSavedObjectsClient: SavedObjectsClientContract,
  logger: Logger
): Promise<number> {
  const cutoffDate = new Date(Date.now() - 90 * MS_PER_DAY);

  let finder:
    | ReturnType<typeof unsecuredSavedObjectsClient.createPointInTimeFinder<UserConnectorToken>>
    | undefined;
  let totalDeleted = 0;

  try {
    finder = unsecuredSavedObjectsClient.createPointInTimeFinder<UserConnectorToken>({
      type: USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
      filter: `${USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.updated_at < "${cutoffDate.toISOString()}"`,
      perPage: 100,
    });

    for await (const response of finder.find()) {
      if (response.saved_objects.length === 0) continue;

      const result = await unsecuredSavedObjectsClient.bulkDelete(
        response.saved_objects.map((obj) => ({
          type: USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
          id: obj.id,
        }))
      );
      totalDeleted += result.statuses.filter((s) => s.success).length;
    }
  } catch (err) {
    logger.error(
      `Failed to cleanup stale user connector tokens. Error: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  } finally {
    await finder?.close();
  }

  logger.debug(`Cleaned up ${totalDeleted} stale user connector tokens`);
  return totalDeleted;
}
