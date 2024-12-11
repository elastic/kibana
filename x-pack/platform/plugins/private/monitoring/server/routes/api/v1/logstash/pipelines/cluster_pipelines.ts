/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getClusterStatus } from '../../../../../lib/logstash/get_cluster_status';
import { handleError } from '../../../../../lib/errors';
import { getPaginatedPipelines } from '../../../../../lib/logstash/get_paginated_pipelines';
import { MonitoringCore, PipelineMetricKey } from '../../../../../types';
import { createValidationFunction } from '../../../../../lib/create_route_validation_function';
import {
  postLogstashClusterPipelinesRequestParamsRT,
  postLogstashClusterPipelinesRequestPayloadRT,
} from '../../../../../../common/http_api/logstash';

const throughputMetric = 'logstash_cluster_pipeline_throughput';
const nodesCountMetric = 'logstash_cluster_pipeline_nodes_count';

// Mapping client and server metric keys together
const sortMetricSetMap = {
  latestThroughput: throughputMetric,
  latestNodesCount: nodesCountMetric,
};

export function logstashClusterPipelinesRoute(server: MonitoringCore) {
  const validateParams = createValidationFunction(postLogstashClusterPipelinesRequestParamsRT);
  const validateBody = createValidationFunction(postLogstashClusterPipelinesRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/logstash/pipelines',
    validate: {
      params: validateParams,
      body: validateBody,
    },
    options: {
      access: 'internal',
    },
    async handler(req) {
      const {
        pagination,
        sort: { field = '', direction = 'desc' } = {},
        queryText = '',
      } = req.payload;
      const clusterUuid = req.params.clusterUuid;

      try {
        const response = await getPaginatedPipelines({
          req,
          clusterUuid,
          metrics: { throughputMetric, nodesCountMetric },
          pagination,
          sort: {
            field: (sortMetricSetMap[field as keyof typeof sortMetricSetMap] ??
              field) as PipelineMetricKey,
            direction,
          },
          queryText,
        });

        return {
          ...response,
          clusterStatus: await getClusterStatus(req, { clusterUuid }),
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
