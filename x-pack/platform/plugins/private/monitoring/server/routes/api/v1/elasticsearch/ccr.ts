/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, groupBy } from 'lodash';
import {
  getIndexPatterns,
  getElasticsearchDataset,
} from '../../../../../common/get_index_patterns';
import {
  postElasticsearchCcrRequestParamsRT,
  postElasticsearchCcrRequestPayloadRT,
  PostElasticsearchCcrResponsePayload,
  postElasticsearchCcrResponsePayloadRT,
  CcrBucket,
  CcrFullStats,
  CcrShard,
  CcrShardBucket,
} from '../../../../../common/http_api/elasticsearch';
import { TimeRange } from '../../../../../common/http_api/shared';
import {
  ElasticsearchLegacySource,
  ElasticsearchMetricbeatSource,
  ElasticsearchResponse,
} from '../../../../../common/types/es';
import { MonitoringConfig } from '../../../../config';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { handleError } from '../../../../lib/errors/handle_error';
import { MonitoringCore } from '../../../../types';

function getBucketScript(max: string, min: string) {
  return {
    bucket_script: {
      buckets_path: {
        max,
        min,
      },
      script: 'params.max - params.min',
    },
  };
}

interface BuildRequestParams {
  clusterUuid: string;
  config: MonitoringConfig;
  esIndexPattern: string;
  timeRange: TimeRange;
}

function buildRequest({ clusterUuid, config, esIndexPattern, timeRange }: BuildRequestParams) {
  const { min, max } = timeRange;
  const maxBucketSize = config.ui.max_bucket_size;
  const aggs = {
    ops_synced_max: {
      max: {
        field: 'ccr_stats.operations_written',
      },
    },
    ops_synced_min: {
      min: {
        field: 'ccr_stats.operations_written',
      },
    },
    lag_ops_leader_max: {
      max: {
        field: 'ccr_stats.leader_max_seq_no',
      },
    },
    lag_ops_leader_min: {
      min: {
        field: 'ccr_stats.leader_max_seq_no',
      },
    },
    lag_ops_global_max: {
      max: {
        field: 'ccr_stats.follower_global_checkpoint',
      },
    },
    lag_ops_global_min: {
      min: {
        field: 'ccr_stats.follower_global_checkpoint',
      },
    },
    leader_lag_ops_checkpoint_max: {
      max: {
        field: 'ccr_stats.leader_global_checkpoint',
      },
    },
    leader_lag_ops_checkpoint_min: {
      min: {
        field: 'ccr_stats.leader_global_checkpoint',
      },
    },

    ops_synced: getBucketScript('ops_synced_max', 'ops_synced_min'),
    lag_ops_leader: getBucketScript('lag_ops_leader_max', 'lag_ops_leader_min'),
    lag_ops_global: getBucketScript('lag_ops_global_max', 'lag_ops_global_min'),
    lag_ops: getBucketScript('lag_ops_leader', 'lag_ops_global'),
    lag_ops_leader_checkpoint: getBucketScript(
      'leader_lag_ops_checkpoint_max',
      'leader_lag_ops_checkpoint_min'
    ),
    leader_lag_ops: getBucketScript('lag_ops_leader', 'lag_ops_leader_checkpoint'),
    follower_lag_ops: getBucketScript('lag_ops_leader_checkpoint', 'lag_ops_global'),
  };

  return {
    index: esIndexPattern,
    size: maxBucketSize,
    filter_path: [
      'hits.hits.inner_hits.by_shard.hits.hits._source.ccr_stats.read_exceptions',
      'hits.hits.inner_hits.by_shard.hits.hits._source.elasticsearch.ccr.read_exceptions',
      'hits.hits.inner_hits.by_shard.hits.hits._source.ccr_stats.follower_index',
      'hits.hits.inner_hits.by_shard.hits.hits._source.elasticsearch.ccr.follower.index',
      'hits.hits.inner_hits.by_shard.hits.hits._source.ccr_stats.shard_id',
      'hits.hits.inner_hits.by_shard.hits.hits._source.elasticsearch.ccr.follower.shard.number',
      'hits.hits.inner_hits.by_shard.hits.hits._source.ccr_stats.time_since_last_read_millis',
      'hits.hits.inner_hits.by_shard.hits.hits._source.elasticsearch.ccr.follower.time_since_last_read.ms',
      'aggregations.by_follower_index.buckets.key',
      'aggregations.by_follower_index.buckets.leader_index.buckets.key',
      'aggregations.by_follower_index.buckets.leader_index.buckets.remote_cluster.buckets.key',
      'aggregations.by_follower_index.buckets.by_shard_id.buckets.key',
      'aggregations.by_follower_index.buckets.by_shard_id.buckets.ops_synced.value',
      'aggregations.by_follower_index.buckets.by_shard_id.buckets.lag_ops.value',
      'aggregations.by_follower_index.buckets.by_shard_id.buckets.leader_lag_ops.value',
      'aggregations.by_follower_index.buckets.by_shard_id.buckets.follower_lag_ops.value',
    ],
    body: {
      sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
      query: {
        bool: {
          must: [
            {
              term: {
                cluster_uuid: {
                  value: clusterUuid,
                },
              },
            },
            {
              bool: {
                should: [
                  {
                    term: {
                      type: {
                        value: 'ccr_stats',
                      },
                    },
                  },
                  {
                    term: {
                      'metricset.name': {
                        value: 'ccr',
                      },
                    },
                  },
                  {
                    term: {
                      'data_stream.dataset': {
                        value: getElasticsearchDataset('ccr'),
                      },
                    },
                  },
                ],
              },
            },
            {
              range: {
                timestamp: {
                  format: 'epoch_millis',
                  gte: min,
                  lte: max,
                },
              },
            },
          ],
        },
      },
      collapse: {
        field: 'ccr_stats.follower_index',
        inner_hits: {
          name: 'by_shard',
          sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
          size: maxBucketSize,
          collapse: {
            field: 'ccr_stats.shard_id',
          },
        },
      },
      aggs: {
        by_follower_index: {
          terms: {
            field: 'ccr_stats.follower_index',
            size: maxBucketSize,
          },
          aggs: {
            leader_index: {
              terms: {
                field: 'ccr_stats.leader_index',
                size: 1,
              },
              aggs: {
                remote_cluster: {
                  terms: {
                    field: 'ccr_stats.remote_cluster',
                    size: 1,
                  },
                },
              },
            },
            by_shard_id: {
              terms: {
                field: 'ccr_stats.shard_id',
                size: 10,
              },
              aggs,
            },
          },
        },
      },
    },
  };
}

function buildShardStats({
  fullStats,
  bucket,
  shardBucket,
}: {
  bucket: CcrBucket;
  fullStats: CcrFullStats;
  shardBucket: CcrShardBucket;
}) {
  const fullStat: any = fullStats[`${bucket.key}:${shardBucket.key}`][0];
  const fullLegacyStat: ElasticsearchLegacySource = fullStat._source?.ccr_stats
    ? fullStat._source
    : null;
  const fullMbStat: ElasticsearchMetricbeatSource = fullStat._source?.elasticsearch?.ccr
    ? fullStat._source
    : null;
  const readExceptions =
    fullLegacyStat?.ccr_stats?.read_exceptions ??
    fullMbStat?.elasticsearch?.ccr?.read_exceptions ??
    [];
  const shardStat = {
    shardId: shardBucket.key,
    error: readExceptions.length ? readExceptions[0].exception?.type : null,
    opsSynced: get(shardBucket, 'ops_synced.value'),
    syncLagTime:
      fullLegacyStat?.ccr_stats?.time_since_last_read_millis ??
      fullMbStat?.elasticsearch?.ccr?.follower?.time_since_last_read?.ms,
    syncLagOps: get(shardBucket, 'lag_ops.value'),
    syncLagOpsLeader: get(shardBucket, 'leader_lag_ops.value'),
    syncLagOpsFollower: get(shardBucket, 'follower_lag_ops.value'),
  };

  return shardStat;
}

export function ccrRoute(server: MonitoringCore) {
  const validateParams = createValidationFunction(postElasticsearchCcrRequestParamsRT);
  const validateBody = createValidationFunction(postElasticsearchCcrRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch/ccr',
    validate: {
      params: validateParams,
      body: validateBody,
    },
    options: {
      access: 'internal',
    },
    async handler(req) {
      const config = server.config;
      const ccs = req.payload.ccs;
      const { clusterUuid } = req.params;
      const dataset = 'ccr';
      const moduleType = 'elasticsearch';
      const esIndexPattern = getIndexPatterns({
        config,
        moduleType,
        dataset,
        ccs,
      });

      try {
        const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
        const params = buildRequest({
          clusterUuid,
          config,
          esIndexPattern,
          timeRange: req.payload.timeRange,
        });
        const response: ElasticsearchResponse = await callWithRequest(req, 'search', params);

        if (!response || Object.keys(response).length === 0) {
          return [];
        }

        const fullStats: CcrFullStats =
          response.hits?.hits.reduce((accum, hit) => {
            const innerHits = hit.inner_hits?.by_shard.hits?.hits ?? [];
            const grouped = groupBy(innerHits, (innerHit) => {
              if (innerHit._source.ccr_stats) {
                return `${innerHit._source.ccr_stats.follower_index}:${innerHit._source.ccr_stats.shard_id}`;
              } else if (innerHit._source.elasticsearch?.ccr?.follower?.shard) {
                return `${innerHit._source.elasticsearch?.ccr?.follower?.index}:${innerHit._source.elasticsearch?.ccr?.follower?.shard?.number}`;
              }
            });

            return {
              ...accum,
              ...grouped,
            };
          }, {}) ?? {};

        const buckets = response.aggregations?.by_follower_index.buckets ?? [];

        const data: PostElasticsearchCcrResponsePayload = buckets.map((bucket: CcrBucket) => {
          const leaderIndex = get(bucket, 'leader_index.buckets[0].key');
          const remoteCluster = get(
            bucket,
            'leader_index.buckets[0].remote_cluster.buckets[0].key'
          );
          const follows = remoteCluster ? `${leaderIndex} on ${remoteCluster}` : leaderIndex;

          // @ts-expect-error `shards.error` type mismatch (error: string | undefined vs. error: { error: string | undefined })
          const shards: CcrShard[] = get(bucket, 'by_shard_id.buckets').map(
            (shardBucket: CcrShardBucket) => buildShardStats({ bucket, fullStats, shardBucket })
          );

          const error = (shards.find((shard) => shard.error) || {}).error;
          const opsSynced = shards.reduce((sum, curr) => sum + curr.opsSynced, 0);
          const syncLagTime = shards.reduce((max, curr) => Math.max(max, curr.syncLagTime), 0);
          const syncLagOps = shards.reduce((max, curr) => Math.max(max, curr.syncLagOps), 0);

          const stat = {
            id: bucket.key,
            index: bucket.key,
            follows,
            shards,
            error,
            opsSynced,
            syncLagTime,
            syncLagOps,
          };

          return stat;
        });

        return postElasticsearchCcrResponsePayloadRT.encode(data);
      } catch (err) {
        return handleError(err, req);
      }
    },
  });
}
