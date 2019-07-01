/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router, RouterRouteHandler } from '../../../../../server/lib/create_router';
import { RestoreSettings, SnapshotRestore, SnapshotRestoreShardEs } from '../../../common/types';
import { serializeRestoreSettings } from '../../../common/lib';
import { deserializeRestoreShard } from '../../lib';

export function registerRestoreRoutes(router: Router) {
  router.post('restore/{repository}/{snapshot}', createHandler);
  router.get('restores', getAllHandler);
}

export const createHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const { repository, snapshot } = req.params;
  const restoreSettings = req.payload as RestoreSettings;

  return await callWithRequest('snapshot.restore', {
    repository,
    snapshot,
    body: serializeRestoreSettings(restoreSettings),
  });
};

export const getAllHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const snapshotRestores: SnapshotRestore[] = [];
  const recoveryByIndexName: {
    [key: string]: {
      shards: SnapshotRestoreShardEs[];
    };
  } = await callWithRequest('indices.recovery', {
    human: true,
  });

  // Filter to snapshot-recovered shards only
  Object.keys(recoveryByIndexName).forEach(index => {
    const recovery = recoveryByIndexName[index];
    let latestActivityTimeInMillis: number = 0;
    let latestEndTimeInMillis: number | null = null;
    const snapshotShards = (recovery.shards || [])
      .filter(shard => shard.type === 'SNAPSHOT')
      .sort((a, b) => a.id - b.id)
      .map(shard => {
        const deserializedShard = deserializeRestoreShard(shard);
        const { startTimeInMillis, stopTimeInMillis } = deserializedShard;

        // Set overall latest activity time
        latestActivityTimeInMillis = Math.max(
          startTimeInMillis || 0,
          stopTimeInMillis || 0,
          latestActivityTimeInMillis
        );

        // Set overall end time
        if (stopTimeInMillis === undefined) {
          latestEndTimeInMillis = null;
        } else if (latestEndTimeInMillis === null || stopTimeInMillis > latestEndTimeInMillis) {
          latestEndTimeInMillis = stopTimeInMillis;
        }

        return deserializedShard;
      });

    if (snapshotShards.length > 0) {
      snapshotRestores.push({
        index,
        latestActivityTimeInMillis,
        shards: snapshotShards,
        isComplete: latestEndTimeInMillis !== null,
      });
    }
  });

  // Sort by latest activity
  snapshotRestores.sort((a, b) => b.latestActivityTimeInMillis - a.latestActivityTimeInMillis);

  return snapshotRestores;
};
