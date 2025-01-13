/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ElasticsearchLegacySource, ElasticsearchMetricbeatSource } from '../../types/es';
import { clusterUuidRT, ccsRT, timeRangeRT } from '../shared';

export const postElasticsearchCcrRequestParamsRT = rt.type({
  clusterUuid: clusterUuidRT,
});

export const postElasticsearchCcrRequestPayloadRT = rt.intersection([
  rt.partial({
    ccs: ccsRT,
  }),
  rt.type({
    timeRange: timeRangeRT,
  }),
]);

export type PostElasticsearchCcrRequestPayload = rt.TypeOf<
  typeof postElasticsearchCcrRequestPayloadRT
>;

const errorRt = rt.partial({ error: rt.union([rt.string, rt.undefined]) });

export const CcrShardRT = rt.type({
  shardId: rt.number,
  error: errorRt,
  opsSynced: rt.number,
  syncLagTime: rt.number,
  syncLagOps: rt.number,
  syncLagOpsLeader: rt.number,
  syncLagOpsFollower: rt.number,
});

export type CcrShard = rt.TypeOf<typeof CcrShardRT>;

export const postElasticsearchCcrResponsePayloadRT = rt.array(
  rt.type({
    id: rt.string,
    index: rt.string,
    follows: rt.string,
    shards: rt.array(CcrShardRT),
    error: errorRt,
    opsSynced: rt.number,
    syncLagTime: rt.number,
    syncLagOps: rt.number,
  })
);

export type PostElasticsearchCcrResponsePayload = rt.TypeOf<
  typeof postElasticsearchCcrResponsePayloadRT
>;

interface ValueObj<T> {
  value: T;
}
export interface CcrShardBucket {
  key: number;
  ops_synced: ValueObj<string>;
  lag_ops: ValueObj<number>;
  leader_lag_ops: ValueObj<number>;
  follower_lag_ops: ValueObj<number>;
}

export interface CcrBucket {
  key: string;
  by_shard_id: {
    buckets: CcrShardBucket[];
  };
  leader_index: {
    buckets: Array<{
      remote_cluster: {
        buckets: Array<{
          key: string;
        }>;
      };
    }>;
  };
}

export interface CcrFullStats {
  [key: string]: Array<
    | NonNullable<ElasticsearchLegacySource['ccr_stats']>
    | NonNullable<ElasticsearchMetricbeatSource['elasticsearch']>['ccr']
  >;
}
