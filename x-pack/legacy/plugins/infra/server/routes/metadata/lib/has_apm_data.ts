/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  InfraFrameworkRequest,
  InfraBackendFrameworkAdapter,
} from '../../../lib/adapters/framework';
import { InfraSourceConfiguration } from '../../../lib/sources';
import { getApmFieldName } from '../../../../common/utils/get_apm_field_name';
import { InfraNodeType } from '../../../../common/http_api/common';

export const hasAPMData = async (
  framework: InfraBackendFrameworkAdapter,
  req: InfraFrameworkRequest,
  sourceConfiguration: InfraSourceConfiguration,
  nodeId: string,
  nodeType: InfraNodeType
) => {
  const config = framework.config(req);
  const apmIndex = config.get('apm_oss.transactionIndices') || 'apm-*';
  const nodeFieldName = getApmFieldName(sourceConfiguration, nodeType);
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
  const response = await framework.callWithRequest<{}, {}>(req, 'search', params);
  return response.hits.total.value !== 0;
};
