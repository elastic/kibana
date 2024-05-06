/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  postLogstashNodeRequestParamsRT,
  postLogstashNodeRequestPayloadRT,
} from '../../../../../common/http_api/logstash';
import { getNodeInfo } from '../../../../lib/logstash/get_node_info';
import { handleError } from '../../../../lib/errors';
import {
  getMetrics,
  isNamedMetricDescriptor,
  NamedMetricDescriptor,
} from '../../../../lib/details/get_metrics';
import { metricSets } from './metric_set_node';
import { MonitoringCore } from '../../../../types';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { getLogstashDataset } from '../../../../lib/cluster/get_index_patterns';

const { advanced: metricSetAdvanced, overview: metricSetOverview } = metricSets;

export function logstashNodeRoute(server: MonitoringCore) {
  const validateParams = createValidationFunction(postLogstashNodeRequestParamsRT);
  const validateBody = createValidationFunction(postLogstashNodeRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/logstash/node/{logstashUuid}',
    validate: {
      params: validateParams,
      body: validateBody,
    },
    async handler(req) {
      const config = server.config;
      const clusterUuid = req.params.clusterUuid;
      const logstashUuid = req.params.logstashUuid;

      let metricSet;
      if (req.payload.is_advanced) {
        metricSet = metricSetAdvanced;
      } else {
        metricSet = metricSetOverview;
        // set the cgroup option if needed
        const showCgroupMetricsLogstash = config.ui.container.logstash.enabled;
        const metricCpu = metricSet.find(
          (m): m is NamedMetricDescriptor =>
            isNamedMetricDescriptor(m) && m.name === 'logstash_node_cpu_metric'
        );

        if (metricCpu) {
          if (showCgroupMetricsLogstash) {
            metricCpu.keys = ['logstash_node_cgroup_quota_as_cpu_utilization'];
          } else {
            metricCpu.keys = ['logstash_node_cpu_utilization'];
          }
        }
      }

      try {
        const dsDataset = 'node_stats';
        const [metrics, nodeSummary] = await Promise.all([
          getMetrics(req, 'logstash', metricSet, [
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
          getNodeInfo(req, { clusterUuid, logstashUuid }),
        ]);

        return {
          metrics,
          nodeSummary,
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
