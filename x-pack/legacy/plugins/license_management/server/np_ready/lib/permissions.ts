/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'src/core/server';
import { ElasticsearchPlugin } from '../../../../../../../src/legacy/core_plugins/elasticsearch';

export async function getPermissions(
  req: KibanaRequest,
  elasticsearch: ElasticsearchPlugin,
  xpackInfo: any
) {
  const securityInfo = xpackInfo && xpackInfo.isAvailable() && xpackInfo.feature('security');
  if (!securityInfo || !securityInfo.isAvailable() || !securityInfo.isEnabled()) {
    // If security isn't enabled, let the user use license management
    return {
      hasPermission: true,
    };
  }

  const { callWithRequest } = elasticsearch.getCluster('admin');
  const options = {
    method: 'POST',
    path: '/_security/user/_has_privileges',
    body: {
      cluster: ['manage'], // License management requires "manage" cluster privileges
    },
  };

  try {
    const response = await callWithRequest(req as any, 'transport.request', options);
    return {
      hasPermission: response.cluster.manage,
    };
  } catch (error) {
    return error.body;
  }
}
