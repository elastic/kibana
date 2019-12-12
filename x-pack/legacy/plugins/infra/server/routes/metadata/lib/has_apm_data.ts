/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'src/core/server';

import { KibanaFramework } from '../../../lib/adapters/framework/kibana_framework_adapter';
import { InfraSourceConfiguration } from '../../../lib/sources';
import { getIdFieldName } from './get_id_field_name';

export const hasAPMData = async (
  framework: KibanaFramework,
  requestContext: RequestHandlerContext,
  sourceConfiguration: InfraSourceConfiguration,
  nodeId: string,
  nodeType: 'host' | 'pod' | 'container'
) => {
  const apmIndices = await framework.plugins.apm.getApmIndices(
    requestContext.core.savedObjects.client
  );
  const apmIndex = apmIndices['apm_oss.transactionIndices'] || 'apm-*';

  // There is a bug in APM ECS data where host.name is not set.
  // This will fixed with: https://github.com/elastic/apm-server/issues/2502
  const nodeFieldName =
    nodeType === 'host' ? 'host.hostname' : getIdFieldName(sourceConfiguration, nodeType);
  const params = {
    allowNoIndices: true,
    ignoreUnavailable: true,
    terminateAfter: 1,
    index: apmIndex,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              match: { [nodeFieldName]: nodeId },
            },
            {
              exists: { field: 'service.name' },
            },
            {
              exists: { field: 'transaction.type' },
            },
          ],
        },
      },
    },
  };
  const response = await framework.callWithRequest<{}, {}>(requestContext, 'search', params);
  return response.hits.total.value !== 0;
};
