/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { InfraSourceConfiguration } from '../../sources';
import {
  InfraBackendFrameworkAdapter,
  InfraFrameworkRequest,
  InfraMetadataAggregationResponse,
} from '../framework';
import { InfraMetadataAdapter, InfraMetricsAdapterResponse } from './adapter_types';
import { NAME_FIELDS } from '../../constants';

export class ElasticsearchMetadataAdapter implements InfraMetadataAdapter {
  private framework: InfraBackendFrameworkAdapter;
  constructor(framework: InfraBackendFrameworkAdapter) {
    this.framework = framework;
  }

  public async getMetricMetadata(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    nodeId: string,
    nodeType: 'host' | 'container' | 'pod'
  ): Promise<InfraMetricsAdapterResponse> {
    const idFieldName = getIdFieldName(sourceConfiguration, nodeType);
    const metricQuery = {
      allowNoIndices: true,
      ignoreUnavailable: true,
      index: sourceConfiguration.metricAlias,
      body: {
        query: {
          bool: {
            filter: {
              term: { [idFieldName]: nodeId },
            },
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

    const response = await this.framework.callWithRequest<
      any,
      { metrics?: InfraMetadataAggregationResponse; nodeName?: InfraMetadataAggregationResponse }
    >(req, 'search', metricQuery);

    const buckets =
      response.aggregations && response.aggregations.metrics
        ? response.aggregations.metrics.buckets
        : [];

    return {
      id: nodeId,
      name: get(response, ['aggregations', 'nodeName', 'buckets', 0, 'key'], nodeId),
      buckets,
    };
  }

  public async getLogMetadata(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    nodeId: string,
    nodeType: 'host' | 'container' | 'pod'
  ): Promise<InfraMetricsAdapterResponse> {
    const idFieldName = getIdFieldName(sourceConfiguration, nodeType);
    const logQuery = {
      allowNoIndices: true,
      ignoreUnavailable: true,
      index: sourceConfiguration.logAlias,
      body: {
        query: {
          bool: {
            filter: {
              term: { [idFieldName]: nodeId },
            },
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

    const response = await this.framework.callWithRequest<
      any,
      { metrics?: InfraMetadataAggregationResponse; nodeName?: InfraMetadataAggregationResponse }
    >(req, 'search', logQuery);

    const buckets =
      response.aggregations && response.aggregations.metrics
        ? response.aggregations.metrics.buckets
        : [];

    return {
      id: nodeId,
      name: get(response, ['aggregations', 'nodeName', 'buckets', 0, 'key'], nodeId),
      buckets,
    };
  }
}

const getIdFieldName = (sourceConfiguration: InfraSourceConfiguration, nodeType: string) => {
  switch (nodeType) {
    case 'host':
      return sourceConfiguration.fields.host;
    case 'container':
      return sourceConfiguration.fields.container;
    default:
      return sourceConfiguration.fields.pod;
  }
};
