/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, first } from 'lodash';
import { InfraSourceConfiguration } from '../../sources';
import {
  InfraBackendFrameworkAdapter,
  InfraFrameworkRequest,
  InfraMetadataAggregationResponse,
} from '../framework';
import { InfraMetadataAdapter, InfraMetricsAdapterResponse } from './adapter_types';
import { NAME_FIELDS } from '../../constants';
import { InfraNodeInfo, InfraNodeType } from '../../../graphql/types';

export class ElasticsearchMetadataAdapter implements InfraMetadataAdapter {
  private framework: InfraBackendFrameworkAdapter;
  constructor(framework: InfraBackendFrameworkAdapter) {
    this.framework = framework;
  }

  public async getMetricMetadata(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    nodeId: string,
    nodeType: InfraNodeType
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
      {},
      {
        metrics?: InfraMetadataAggregationResponse;
        nodeName?: InfraMetadataAggregationResponse;
      }
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

  public async getNodeInfo(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    nodeId: string,
    nodeType: InfraNodeType
  ): Promise<InfraNodeInfo> {
    const params = {
      allowNoIndices: true,
      ignoreUnavailable: true,
      terminateAfter: 1,
      index: sourceConfiguration.metricAlias,
      body: {
        size: 1,
        _source: ['host.*', 'cloud.*'],
        query: {
          bool: {
            must_not: [{ match: { 'event.module': 'aws' } }],
            filter: [{ match: { [getIdFieldName(sourceConfiguration, nodeType)]: nodeId } }],
          },
        },
      },
    };
    const response = await this.framework.callWithRequest<{ _source: InfraNodeInfo }, {}>(
      req,
      'search',
      params
    );
    const firstHit = first(response.hits.hits);
    if (firstHit) {
      return firstHit._source;
    }
    return {};
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
