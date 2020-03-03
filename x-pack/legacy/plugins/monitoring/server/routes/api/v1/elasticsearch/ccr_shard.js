/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import moment from 'moment';
import Joi from 'joi';
import { handleError } from '../../../../lib/errors/handle_error';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../../../../common/constants';

function getFormattedLeaderIndex(leaderIndex) {
  let leader = leaderIndex;
  if (leader.includes(':')) {
    const leaderSplit = leader.split(':');
    leader = `${leaderSplit[1]} on ${leaderSplit[0]}`;
  }
  return leader;
}

async function getCcrStat(req, esIndexPattern, filters) {
  const min = moment.utc(req.payload.timeRange.min).valueOf();
  const max = moment.utc(req.payload.timeRange.max).valueOf();

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');

  const params = {
    index: esIndexPattern,
    size: 1,
    filterPath: [
      'hits.hits._source.ccr_stats',
      'hits.hits._source.timestamp',
      'hits.hits.inner_hits.oldest.hits.hits._source.ccr_stats.operations_written',
      'hits.hits.inner_hits.oldest.hits.hits._source.ccr_stats.failed_read_requests',
    ],
    body: {
      sort: [{ timestamp: { order: 'desc' } }],
      query: {
        bool: {
          must: [
            ...filters,
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
          name: 'oldest',
          size: 1,
          sort: [{ timestamp: 'asc' }],
        },
      },
    },
  };

  return await callWithRequest(req, 'search', params);
}

export function ccrShardRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch/ccr/{index}/shard/{shardId}',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required(),
          index: Joi.string().required(),
          shardId: Joi.string().required(),
        }),
        payload: Joi.object({
          ccs: Joi.string().optional(),
          timeRange: Joi.object({
            min: Joi.date().required(),
            max: Joi.date().required(),
          }).required(),
        }),
      },
    },
    async handler(req) {
      const config = server.config();
      const index = req.params.index;
      const shardId = req.params.shardId;
      const ccs = req.payload.ccs;
      const esIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_ELASTICSEARCH, ccs);

      const filters = [
        {
          term: {
            type: {
              value: 'ccr_stats',
            },
          },
        },
        {
          term: {
            'ccr_stats.follower_index': {
              value: index,
            },
          },
        },
        {
          term: {
            'ccr_stats.shard_id': {
              value: shardId,
            },
          },
        },
      ];

      try {
        const [metrics, ccrResponse] = await Promise.all([
          getMetrics(
            req,
            esIndexPattern,
            [
              { keys: ['ccr_sync_lag_time'], name: 'ccr_sync_lag_time' },
              { keys: ['ccr_sync_lag_ops'], name: 'ccr_sync_lag_ops' },
            ],
            filters
          ),
          getCcrStat(req, esIndexPattern, filters),
        ]);

        const stat = get(ccrResponse, 'hits.hits[0]._source.ccr_stats', {});
        const oldestStat = get(
          ccrResponse,
          'hits.hits[0].inner_hits.oldest.hits.hits[0]._source.ccr_stats',
          {}
        );

        return {
          metrics,
          stat,
          formattedLeader: getFormattedLeaderIndex(stat.leader_index),
          timestamp: get(ccrResponse, 'hits.hits[0]._source.timestamp'),
          oldestStat,
        };
      } catch (err) {
        return handleError(err, req);
      }
    },
  });
}
