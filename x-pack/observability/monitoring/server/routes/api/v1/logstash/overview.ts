/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  postLogstashOverviewRequestParamsRT,
  postLogstashOverviewRequestPayloadRT,
} from '../../../../../common/http_api/logstash/post_logstash_overview';
import { getClusterStatus } from '../../../../lib/logstash/get_cluster_status';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { handleError } from '../../../../lib/errors';
import { metricSet } from './metric_set_overview';
import { MonitoringCore } from '../../../../types';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { getLogstashDataset } from '../../../../lib/cluster/get_index_patterns';

export function logstashOverviewRoute(server: MonitoringCore) {
  const validateParams = createValidationFunction(postLogstashOverviewRequestParamsRT);
  const validateBody = createValidationFunction(postLogstashOverviewRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/logstash',
    validate: {
      params: validateParams,
      body: validateBody,
    },
    async handler(req) {
      const clusterUuid = req.params.clusterUuid;

      try {
        const moduleType = 'logstash';
        const dsDataset = 'node_stats';
        const [metrics, clusterStatus] = await Promise.all([
          getMetrics(req, moduleType, metricSet, [
            {
              bool: {
                should: [
                  { term: { 'data_stream.dataset': getLogstashDataset(dsDataset) } },
                  { term: { 'metricset.name': dsDataset } },
                  { term: { type: 'logstash_stats' } },
                ],
              },
            },
          ]),
          getClusterStatus(req, { clusterUuid }),
        ]);

        return {
          metrics,
          clusterStatus,
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
