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
import {
  InfraMetadataAdapter,
  InfraMetricsAdapterResponse,
  InfraCloudMetricsAdapterResponse,
} from './adapter_types';
import { NAME_FIELDS, CLOUD_METRICS_MODULES } from '../../constants';
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

  public async getCloudMetricMetadata(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    instanceId: string
  ): Promise<InfraCloudMetricsAdapterResponse> {
    const metricQuery = {
      allowNoIndices: true,
      ignoreUnavailable: true,
      index: sourceConfiguration.metricAlias,
      body: {
        query: {
          bool: {
            filter: [{ match: { 'cloud.instance.id': instanceId } }],
            should: CLOUD_METRICS_MODULES.map(module => ({ match: { 'event.module': module } })),
          },
        },
        size: 0,
        aggs: {
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
      }
    >(req, 'search', metricQuery);

    const buckets =
      response.aggregations && response.aggregations.metrics
        ? response.aggregations.metrics.buckets
        : [];

    return { buckets };
  }

  public async getNodeInfo(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    nodeId: string,
    nodeType: InfraNodeType
  ): Promise<InfraNodeInfo> {
    // If the nodeType is a Kubernetes pod then we need to get the node info
    // from a host record instead of a pod. This is due to the fact that any host
    // can report pod details and we can't rely on the host/cloud information associated
    // with the kubernetes.pod.uid. We need to first lookup the `kubernetes.node.name`
    // then use that to lookup the host's node information.
    if (nodeType === InfraNodeType.pod) {
      const kubernetesNodeName = await this.getPodNodeName(
        req,
        sourceConfiguration,
        nodeId,
        nodeType
      );
      if (kubernetesNodeName) {
        return this.getNodeInfo(req, sourceConfiguration, kubernetesNodeName, InfraNodeType.host);
      }
      return {};
    }
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
            must_not: CLOUD_METRICS_MODULES.map(module => ({ match: { 'event.module': module } })),
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

  private async getPodNodeName(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    nodeId: string,
    nodeType: InfraNodeType
  ): Promise<string | undefined> {
    const params = {
      allowNoIndices: true,
      ignoreUnavailable: true,
      terminateAfter: 1,
      index: sourceConfiguration.metricAlias,
      body: {
        size: 1,
        _source: ['kubernetes.node.name'],
        query: {
          bool: {
            filter: [
              { match: { [getIdFieldName(sourceConfiguration, nodeType)]: nodeId } },
              { exists: { field: `kubernetes.node.name` } },
            ],
          },
        },
      },
    };
    const response = await this.framework.callWithRequest<
      { _source: { kubernetes: { node: { name: string } } } },
      {}
    >(req, 'search', params);
    const firstHit = first(response.hits.hits);
    if (firstHit) {
      return get(firstHit, '_source.kubernetes.node.name');
    }
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
