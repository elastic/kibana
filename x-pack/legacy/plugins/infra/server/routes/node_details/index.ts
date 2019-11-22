/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';
import { boomify } from 'boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { InfraBackendLibs } from '../../lib/infra_types';
import { UsageCollector } from '../../usage/usage_collector';
import { InfraMetricsRequestOptions } from '../../lib/adapters/metrics';
import { InfraNodeType, InfraMetric } from '../../graphql/types';
import {
  NodeDetailsWrappedRequest,
  NodeDetailsRequestRT,
  NodeDetailsMetricDataResponse,
} from '../../../common/http_api/node_details_api';
import { throwErrors } from '../../../common/runtime_types';

export const initNodeDetailsRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;

  framework.registerRoute<NodeDetailsWrappedRequest, Promise<NodeDetailsMetricDataResponse>>({
    method: 'POST',
    path: '/api/metrics/node_details',
    handler: async req => {
      const { nodeId, cloudId, nodeType, metrics, timerange, sourceId } = pipe(
        NodeDetailsRequestRT.decode(req.payload),
        fold(throwErrors(Boom.badRequest), identity)
      );
      try {
        const source = await libs.sources.getSourceConfiguration(req, sourceId);

        UsageCollector.countNode(nodeType);
        const options: InfraMetricsRequestOptions = {
          nodeIds: {
            nodeId,
            cloudId,
          },
          nodeType: nodeType as InfraNodeType,
          sourceConfiguration: source.configuration,
          metrics: metrics as InfraMetric[],
          timerange,
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
