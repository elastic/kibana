/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraFrameworkRequest, InfraMetadataAggregationBucket } from '../../adapters/framework';
import { InfraMetadataAdapter } from '../../adapters/metadata';
import { InfraSources } from '../../sources';
import { InfraNodeType } from '../../../graphql/types';

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
    const metricsPromise = this.adapter.getMetricMetadata(req, configuration, nodeId, nodeType);

    const metrics = await metricsPromise;

    const metricMetadata = pickMetadata(metrics.buckets).map(entry => {
      return { name: entry, source: 'metrics' };
    });

    const info = await this.adapter.getNodeInfo(req, configuration, nodeId, nodeType);

    const id = metrics.id;
    const name = metrics.name || id;
    return { id, name, features: metricMetadata, info };
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
