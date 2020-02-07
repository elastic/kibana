/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'src/core/server';

import { KibanaFramework } from '../../../lib/adapters/framework/kibana_framework_adapter';
import { InfraSourceConfiguration } from '../../../lib/sources';
import { findInventoryFields } from '../../../../common/inventory_models';
import { InventoryItemType } from '../../../../common/inventory_models/types';

export const hasAPMData = async (
  framework: KibanaFramework,
  requestContext: RequestHandlerContext,
  sourceConfiguration: InfraSourceConfiguration,
  nodeId: string,
  nodeType: InventoryItemType
) => {
  const apmIndices = await framework.plugins.apm.getApmIndices(
    requestContext.core.savedObjects.client
  );
  const apmIndex = apmIndices['apm_oss.transactionIndices'] || 'apm-*';
  const fields = findInventoryFields(nodeType, sourceConfiguration.fields);

  // There is a bug in APM ECS data where host.name is not set.
  // This will fixed with: https://github.com/elastic/apm-server/issues/2502
  const nodeFieldName = nodeType === 'host' ? 'host.hostname' : fields.id;
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
