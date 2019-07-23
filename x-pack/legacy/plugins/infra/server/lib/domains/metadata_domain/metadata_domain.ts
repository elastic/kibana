/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { InfraFrameworkRequest, InfraMetadataAggregationBucket } from '../../adapters/framework';
import { InfraMetadataAdapter } from '../../adapters/metadata';
import { InfraSources, InfraSourceConfiguration } from '../../sources';
import { InfraNodeType, InfraNodeFeature } from '../../../graphql/types';

export class InfraMetadataDomain {
  constructor(
    private readonly adapter: InfraMetadataAdapter,
    private readonly libs: { sources: InfraSources }
  ) {}

  public async getMetadata(
    req: InfraFrameworkRequest,
    sourceId: string,
    nodeId: string,
    nodeType: InfraNodeType
  ) {
    const { configuration } = await this.libs.sources.getSourceConfiguration(req, sourceId);

    const metrics = await this.adapter.getMetricMetadata(req, configuration, nodeId, nodeType);
    const metricMetadata = pickMetadata(metrics.buckets).map(entry => {
      return { name: entry, source: 'metrics' };
    });

    const info = await this.adapter.getNodeInfo(req, configuration, nodeId, nodeType);
    const cloudInstanceId = get<string>(info, 'cloud.instance.id');

    const cloudMetricsMetadata = cloudInstanceId
      ? await this.getCloudMetricsMetadata(req, configuration, cloudInstanceId)
      : [];

    const id = metrics.id;
    const name = metrics.name || id;
    return { id, name, features: metricMetadata.concat(cloudMetricsMetadata), info };
  }

  private async getCloudMetricsMetadata(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    instanceId: string
  ): Promise<InfraNodeFeature[]> {
    const cloudMetrics = await this.adapter.getCloudMetricMetadata(
      req,
      sourceConfiguration,
      instanceId
    );
    return pickMetadata(cloudMetrics.buckets).map(entry => {
      return { name: entry, source: 'metrics' };
    });
  }
}

const pickMetadata = (buckets: InfraMetadataAggregationBucket[]): string[] => {
  if (buckets) {
    const metadata = buckets.map(bucket => bucket.key);
    return metadata;
  } else {
    return [];
  }
};
