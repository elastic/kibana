/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { SnapshotRestore, SnapshotRestoreShardEs } from '../../../common/types';
import { serializeRestoreSettings } from '../../../common/lib';
import { deserializeRestoreShard } from '../../lib';
import { RouteDependencies } from '../../types';
import { addBasePath } from '../helpers';
import { restoreSettingsSchema } from './validate_schemas';

export function registerRestoreRoutes({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) {
  // GET all snapshot restores
  router.get(
    { path: addBasePath('restores'), validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const { client: clusterClient } = (await ctx.core).elasticsearch;

      try {
        const snapshotRestores: SnapshotRestore[] = [];
        const recoveryByIndexName = await clusterClient.asCurrentUser.indices.recovery({
          human: true,
        });

        // Filter to snapshot-recovered shards only
        Object.keys(recoveryByIndexName).forEach((index) => {
          const recovery = recoveryByIndexName[index];
          let latestActivityTimeInMillis: number = 0;
          let latestEndTimeInMillis: number | null = null;
          const snapshotShards = (recovery.shards || [])
            .filter((shard) => shard.type === 'SNAPSHOT')
            .sort((a, b) => a.id - b.id)
            .map((shard) => {
              // TODO: Bring {@link SnapshotRestoreShardEs} in line with {@link ShardRecovery}
              const deserializedShard = deserializeRestoreShard(shard as SnapshotRestoreShardEs);
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
              } else if (
                latestEndTimeInMillis === null ||
                stopTimeInMillis > latestEndTimeInMillis
              ) {
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
        snapshotRestores.sort(
          (a, b) => b.latestActivityTimeInMillis - a.latestActivityTimeInMillis
        );

        return res.ok({ body: snapshotRestores });
      } catch (e) {
        return handleEsError({ error: e, response: res });
      }
    })
  );

  // Restore snapshot
  const restoreParamsSchema = schema.object({
    repository: schema.string(),
    snapshot: schema.string(),
  });

  router.post(
    {
      path: addBasePath('restore/{repository}/{snapshot}'),
      validate: { body: restoreSettingsSchema, params: restoreParamsSchema },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { client: clusterClient } = (await ctx.core).elasticsearch;
      const { repository, snapshot } = req.params as TypeOf<typeof restoreParamsSchema>;
      const restoreSettings = req.body as TypeOf<typeof restoreSettingsSchema>;

      try {
        const response = await clusterClient.asCurrentUser.snapshot.restore({
          repository,
          snapshot,
          // TODO: Bring {@link RestoreSettingsEs} in line with {@link RestoreRequest['body']}
          body: serializeRestoreSettings(restoreSettings) as estypes.SnapshotRestoreRequest['body'],
        });

        return res.ok({ body: response });
      } catch (e) {
        return handleEsError({ error: e, response: res });
      }
    })
  );
}
