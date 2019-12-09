/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { RequestHandlerContext } from 'src/core/server';
import {
  InfraMetadataAggregationBucket,
  InfraMetadataAggregationResponse,
} from '../../../lib/adapters/framework';
import { KibanaFramework } from '../../../lib/adapters/framework/kibana_framework_adapter';
import { InfraSourceConfiguration } from '../../../lib/sources';
import { getIdFieldName } from './get_id_field_name';
import { NAME_FIELDS } from '../../../lib/constants';

export interface InfraMetricsAdapterResponse {
  id: string;
  name?: string;
  buckets: InfraMetadataAggregationBucket[];
}

export const getMetricMetadata = async (
  framework: KibanaFramework,
  requestContext: RequestHandlerContext,
  sourceConfiguration: InfraSourceConfiguration,
  nodeId: string,
  nodeType: 'host' | 'pod' | 'container'
): Promise<InfraMetricsAdapterResponse> => {
  const idFieldName = getIdFieldName(sourceConfiguration, nodeType);

  const metricQuery = {
    allowNoIndices: true,
    ignoreUnavailable: true,
    index: sourceConfiguration.metricAlias,
    body: {
      query: {
        bool: {
          must_not: [{ match: { 'event.dataset': 'aws.ec2' } }],
          filter: [
            {
              match: { [idFieldName]: nodeId },
            },
          ],
        },
      },
      size: 0,
      aggs: {
        nodeName: {
          terms: {
            field: NAME_FIELDS[nodeType],
            size: 1,
          },
        },
        metrics: {
          terms: {
            field: 'event.dataset',
            size: 1000,
          },
        },
      },
    },
  };

  const response = await framework.callWithRequest<
    {},
    {
      metrics?: InfraMetadataAggregationResponse;
      nodeName?: InfraMetadataAggregationResponse;
    }
  >(requestContext, 'search', metricQuery);

  const buckets =
    response.aggregations && response.aggregations.metrics
      ? response.aggregations.metrics.buckets
      : [];

  return {
    id: nodeId,
    name: get(response, ['aggregations', 'nodeName', 'buckets', 0, 'key'], nodeId),
    buckets,
  };
};
