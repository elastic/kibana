/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapCustomError } from '../../../../server/lib/create_router/error_wrappers';

export async function getPermissions(req, xpackInfo) {
  if (!xpackInfo) {
    // xpackInfo is updated via poll, so it may not be available until polling has begun.
    // In this rare situation, tell the client the service is temporarily unavailable.
    throw wrapCustomError(new Error('Security info unavailable'), 503);
  }

  const securityInfo = xpackInfo && xpackInfo.isAvailable() && xpackInfo.feature('security');
  if (!securityInfo || !securityInfo.isAvailable() || !securityInfo.isEnabled()) {
    // If security isn't enabled, let the user use license management
    return {
      hasPermission: true,
    };
  }

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('admin');
  const options = {
    method: 'POST',
    path: '/_security/user/_has_privileges',
    body: {
      cluster: ['manage'], // License management requires "manage" cluster privileges
    },
  };

  try {
    const response = await callWithRequest(req, 'transport.request', options);
    return {
      hasPermission: response.cluster.manage,
    };
  } catch (error) {
    return error.body;
  }
}
