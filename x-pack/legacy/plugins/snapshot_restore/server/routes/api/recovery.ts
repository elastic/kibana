/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router, RouterRouteHandler } from '../../../../../server/lib/create_router';
import { SnapshotRecovery, SnapshotRecoveryShardEs } from '../../../common/types';
import { deserializeRecoveryShard } from '../../lib';

export function registerRecoveryRoutes(router: Router) {
  router.get('recovery', getAllHandler);
}

export const getAllHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const snapshotRecoveries: SnapshotRecovery[] = [];
  const recoveryByIndexName: {
    [key: string]: {
      shards: SnapshotRecoveryShardEs[];
    };
  } = await callWithRequest('indices.recovery', {
    human: true,
  });

  // Filter to snapshot-recovered shards only and sort by index name, then shard id
  Object.keys(recoveryByIndexName)
    .sort()
    .forEach(index => {
      const recovery = recoveryByIndexName[index];
      const snapshotShards = (recovery.shards || [])
        .filter(shard => shard.type === 'SNAPSHOT')
        .sort((a, b) => a.id - b.id)
        .map(shard => deserializeRecoveryShard(shard));

      if (snapshotShards.length > 0) {
        snapshotRecoveries.push({
          index,
          shards: snapshotShards,
        });
      }
    });

  return snapshotRecoveries;
};
