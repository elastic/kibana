/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first, get } from 'lodash';
import {
  InfraFrameworkRequest,
  InfraBackendFrameworkAdapter,
} from '../../../lib/adapters/framework';
import { InfraSourceConfiguration } from '../../../lib/sources';
import { getIdFieldName } from './get_id_field_name';

export const getPodNodeName = async (
  framework: InfraBackendFrameworkAdapter,
  req: InfraFrameworkRequest,
  sourceConfiguration: InfraSourceConfiguration,
  nodeId: string,
  nodeType: 'host' | 'pod' | 'container'
): Promise<string | undefined> => {
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
  const response = await framework.callWithRequest<
    { _source: { kubernetes: { node: { name: string } } } },
    {}
  >(req, 'search', params);
  const firstHit = first(response.hits.hits);
  if (firstHit) {
    return get(firstHit, '_source.kubernetes.node.name');
  }
};
