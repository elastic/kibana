/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'lodash';
import { RequestHandlerContext } from 'src/core/server';
import { KibanaFramework } from '../../../lib/adapters/framework/kibana_framework_adapter';
import { InfraSourceConfiguration } from '../../../lib/sources';
import { InfraNodeType } from '../../../graphql/types';
import { InfraMetadataInfo } from '../../../../common/http_api/metadata_api';
import { getPodNodeName } from './get_pod_node_name';
import { CLOUD_METRICS_MODULES } from '../../../lib/constants';
import { getIdFieldName } from './get_id_field_name';

export const getNodeInfo = async (
  framework: KibanaFramework,
  requestContext: RequestHandlerContext,
  sourceConfiguration: InfraSourceConfiguration,
  nodeId: string,
  nodeType: 'host' | 'pod' | 'container'
): Promise<InfraMetadataInfo> => {
  // If the nodeType is a Kubernetes pod then we need to get the node info
  // from a host record instead of a pod. This is due to the fact that any host
  // can report pod details and we can't rely on the host/cloud information associated
  // with the kubernetes.pod.uid. We need to first lookup the `kubernetes.node.name`
  // then use that to lookup the host's node information.
  if (nodeType === InfraNodeType.pod) {
    const kubernetesNodeName = await getPodNodeName(
      framework,
      requestContext,
      sourceConfiguration,
      nodeId,
      nodeType
    );
    if (kubernetesNodeName) {
      return getNodeInfo(
        framework,
        requestContext,
        sourceConfiguration,
        kubernetesNodeName,
        InfraNodeType.host
      );
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
  const response = await framework.callWithRequest<{ _source: InfraMetadataInfo }, {}>(
    requestContext,
    'search',
    params
  );
  const firstHit = first(response.hits.hits);
  if (firstHit) {
    return firstHit._source;
  }
  return {};
};
