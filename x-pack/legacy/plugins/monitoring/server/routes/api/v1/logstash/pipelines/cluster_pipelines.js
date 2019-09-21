/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import moment from 'moment';
import { get, sortByOrder } from 'lodash';
import { getClusterStatus } from '../../../../../lib/logstash/get_cluster_status';
import { getPipelines, processPipelinesAPIResponse } from '../../../../../lib/logstash/get_pipelines';
import { handleError } from '../../../../../lib/errors';
import { prefixIndexPattern } from '../../../../../lib/ccs_utils';
import { INDEX_PATTERN_LOGSTASH } from '../../../../../../common/constants';
import { createQuery } from '../../../../../lib/create_query';
import { LogstashMetric } from '../../../../../lib/metrics';

async function getLogstashPipelineIds(req, logstashIndexPattern, size) {
  const start = moment.utc(req.payload.timeRange.min).valueOf();
  const end = moment.utc(req.payload.timeRange.max).valueOf();

  const params = {
    index: logstashIndexPattern,
    size: 0,
    ignoreUnavailable: true,
    filterPath: [
      'aggregations.nested_context'
    ],
    body: {
      query: createQuery({
        start,
        end,
        metric: LogstashMetric.getMetricFields(),
        clusterUuid: req.params.clusterUuid,
      }),
      aggs: {
        nested_context: {
          nested: {
            path: 'logstash_stats.pipelines'
          },
          aggs: {
            pipelines: {
              terms: {
                field: 'logstash_stats.pipelines.id',
                size,
              }
            }
          }
        }
      }
    }
  };


  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params);
}

function paginate({ size,  index }, data) {
  const start = index * size;
  return data.slice(start, Math.min(data.length, start + size));
}

/**
 * Retrieve pipelines for a cluster
 */
export function logstashClusterPipelinesRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/logstash/pipelines',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required()
        }),
        payload: Joi.object({
          ccs: Joi.string().optional(),
          timeRange: Joi.object({
            min: Joi.date().required(),
            max: Joi.date().required()
          }).required(),
          pagination: Joi.object({
            index: Joi.number().required(),
            size: Joi.number().required()
          }).required(),
          sort: Joi.object({
            field: Joi.string().required(),
            direction: Joi.string().required()
          }).optional()
        })
      }
    },
    handler: async (req) => {
      const config = server.config();
      const { ccs, pagination, sort } = req.payload;
      const clusterUuid = req.params.clusterUuid;
      const lsIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_LOGSTASH, ccs);

      const rawPipelines = await getLogstashPipelineIds(req, lsIndexPattern, config.get('xpack.monitoring.max_bucket_size'));
      const pipelines = get(rawPipelines, 'aggregations.nested_context.pipelines.buckets', []).map(bucket => ({ id: bucket.key }));

      // Manually apply pagination/sorting/filtering concerns

      // Filtering

      // Sorting
      const sortedPipelines = sortByOrder(pipelines, pipeline => pipeline[sort.field], sort.direction);

      // Pagination
      const pageOfPipelines = paginate(pagination, sortedPipelines);

      // Just the IDs for the rest
      const pipelineIds = pageOfPipelines.map(pipeline => pipeline.id);

      const throughputMetric = 'logstash_cluster_pipeline_throughput';
      const nodesCountMetric = 'logstash_cluster_pipeline_nodes_count';

      const metricSet = [
        throughputMetric,
        nodesCountMetric
      ];

      try {
        const pipelineData = sortByOrder(
          await getPipelines(req, lsIndexPattern, pipelineIds, metricSet),
          pipeline => pipeline[sort.field],
          sort.direction
        );
        const response = await processPipelinesAPIResponse(
          {
            pipelines: pipelineData,
            clusterStatus: await getClusterStatus(req, lsIndexPattern, { clusterUuid })
          },
          throughputMetric,
          nodesCountMetric
        );
        return {
          ...response,
          totalPipelineCount: pipelines.length
        };
      } catch (err) {
        throw handleError(err, req);
      }
    }
  });
}
