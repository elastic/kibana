/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSourceConfiguration } from '../../sources';
import { InfraFrameworkRequest, InfraMetadataAggregationBucket } from '../framework';
import { InfraNodeInfo, InfraNodeType } from '../../../graphql/types';

export interface InfraMetricsAdapterResponse {
  id: string;
  name?: string;
  buckets: InfraMetadataAggregationBucket[];
}

export interface InfraMetadataAdapter {
  getMetricMetadata(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    nodeId: string,
    nodeType: InfraNodeType
  ): Promise<InfraMetricsAdapterResponse>;
  getNodeInfo(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    nodeId: string,
    nodeType: InfraNodeType
  ): Promise<InfraNodeInfo>;
}
