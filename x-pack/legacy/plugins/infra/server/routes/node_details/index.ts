/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { boomify } from 'boom';
import { InfraBackendLibs } from '../../lib/infra_types';
import { UsageCollector } from '../../usage/usage_collector';
import { InfraMetricsRequestOptions } from '../../lib/adapters/metrics';
import { NodeDetailsRequest } from './types';
import { InfraMetricData } from '../../graphql/types';

export const initNodeDetailsRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;

  framework.registerRoute<NodeDetailsRequest, Promise<{ metrics: InfraMetricData[] }>>({
    method: 'POST',
    path: '/api/metrics/node_details',
    handler: async req => {
      try {
        const source = await libs.sources.getSourceConfiguration(req, req.payload.sourceId);
        UsageCollector.countNode(req.payload.nodeType);
        const options: InfraMetricsRequestOptions = {
          nodeIds: {
            nodeId: req.payload.nodeId,
            cloudId: req.payload.cloudId,
          },
          nodeType: req.payload.nodeType,
          sourceConfiguration: source.configuration,
          metrics: req.payload.metrics,
          timerange: req.payload.timerange,
        };

        return {
          metrics: await libs.metrics.getMetrics(req, options),
        };
      } catch (e) {
        throw boomify(e);
      }
    },
  });
};
