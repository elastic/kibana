/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { sortByOrder } from 'lodash';
import { getNodeInfo } from '../../../../../lib/logstash/get_node_info';
import { getPipelines, processPipelinesAPIResponse } from '../../../../../lib/logstash/get_pipelines';
import { handleError } from '../../../../../lib/errors';
import { prefixIndexPattern } from '../../../../../lib/ccs_utils';
import { INDEX_PATTERN_LOGSTASH } from '../../../../../../common/constants';
import { getLogstashPipelineIds } from '../../../../../lib/logstash/get_pipeline_ids';
import { filter } from '../../../../../lib/pagination/filter';
import { paginate } from '../../../../../lib/pagination/paginate';

/**
 * Retrieve pipelines for a node
 */
export function logstashNodePipelinesRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/logstash/node/{logstashUuid}/pipelines',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required(),
          logstashUuid: Joi.string().required()
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
          }).optional(),
          queryText: Joi.string().default('').allow('').optional(),
        })
      }
    },
    handler: async (req) => {
      const config = server.config();
      const { ccs, pagination, sort, queryText } = req.payload;
      const { clusterUuid, logstashUuid } = req.params;
      const lsIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_LOGSTASH, ccs);

      const pipelines = await getLogstashPipelineIds(req, lsIndexPattern);

      // Manually apply pagination/sorting/filtering concerns

      // Filtering
      const filteredPipelines = filter(pipelines, queryText, ['id']);

      // Sorting
      const sortedPipelines = sortByOrder(filteredPipelines, pipeline => pipeline[sort.field], sort.direction);

      // Pagination
      const pageOfPipelines = paginate(pagination, sortedPipelines);

      // Just the IDs for the rest
      const pipelineIds = pageOfPipelines.map(pipeline => pipeline.id);

      const throughputMetric = 'logstash_node_pipeline_throughput';
      const nodesCountMetric = 'logstash_node_pipeline_nodes_count';
      const metricSet = [
        throughputMetric,
        nodesCountMetric
      ];

      const metricOptions = {
        pageOfPipelines,
      };

      try {
        const pipelineData = await getPipelines(req, lsIndexPattern, pipelineIds, metricSet, metricOptions);
        // We need to re-sort because the data from above comes back in random order
        const pipelinesResponse = sortByOrder(
          pipelineData,
          pipeline => pipeline[sort.field],
          sort.direction
        );
        const response = await processPipelinesAPIResponse(
          {
            pipelines: pipelinesResponse,
            nodeSummary: await getNodeInfo(req, lsIndexPattern, { clusterUuid, logstashUuid })
          },
          throughputMetric,
          nodesCountMetric
        );
        return {
          ...response,
          totalPipelineCount: pipelines.length
        };
        return response;
      } catch (err) {
        throw handleError(err, req);
      }
    }
  });
}
