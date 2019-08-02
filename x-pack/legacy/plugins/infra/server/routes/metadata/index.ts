/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom, { boomify } from 'boom';
import { get } from 'lodash';
import {
  InfraMetadata,
  InfraMetadataWrappedRequest,
  InfraMetadataFeature,
  InfraMetadataRequestRT,
  InfraMetadataRT,
} from '../../../common/http_api/metadata_api';
import { InfraBackendLibs } from '../../lib/infra_types';
import { getMetricMetadata } from './lib/get_metric_metadata';
import { pickFeatureName } from './lib/pick_feature_name';
import { getCloudMetricsMetadata } from './lib/get_cloud_metric_metadata';
import { getNodeInfo } from './lib/get_node_info';
import { throwErrors } from '../../../common/runtime_types';

export const initMetadataRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;

  framework.registerRoute<InfraMetadataWrappedRequest, Promise<InfraMetadata>>({
    method: 'POST',
    path: '/api/infra/metadata',
    handler: async req => {
      try {
        const { nodeId, nodeType, sourceId } = InfraMetadataRequestRT.decode(
          req.payload
        ).getOrElseL(throwErrors(Boom.badRequest));

        const { configuration } = await libs.sources.getSourceConfiguration(req, sourceId);
        const metricsMetadata = await getMetricMetadata(
          framework,
          req,
          configuration,
          nodeId,
          nodeType
        );
        const metricFeatures = pickFeatureName(metricsMetadata.buckets).map(
          nameToFeature('metrics')
        );

        const info = await getNodeInfo(framework, req, configuration, nodeId, nodeType);
        const cloudInstanceId = get<string>(info, 'cloud.instance.id');

        const cloudMetricsMetadata = cloudInstanceId
          ? await getCloudMetricsMetadata(framework, req, configuration, cloudInstanceId)
          : { buckets: [] };
        const cloudMetricsFeatures = pickFeatureName(cloudMetricsMetadata.buckets).map(
          nameToFeature('metrics')
        );

        const id = metricsMetadata.id;
        const name = metricsMetadata.name || id;
        return InfraMetadataRT.decode({
          id,
          name,
          features: [...metricFeatures, ...cloudMetricsFeatures],
          info,
        }).getOrElseL(throwErrors(Boom.badImplementation));
      } catch (error) {
        throw boomify(error);
      }
    },
  });
};

const nameToFeature = (source: string) => (name: string): InfraMetadataFeature => ({
  name,
  source,
});
