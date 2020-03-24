/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsError } from '../../../lib/is_es_error';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

async function createPolicy(callWithRequest: any, policy: any): Promise<any> {
  const body = {
    policy: {
      phases: policy.phases,
    },
  };
  const params = {
    method: 'PUT',
    path: `/_ilm/policy/${encodeURIComponent(policy.name)}`,
    ignore: [404],
    body,
  };

  return await callWithRequest('transport.request', params);
}

export function registerCreateRoute(server: any) {
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/index_lifecycle_management/policies',
    method: 'POST',
    handler: async (request: any) => {
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const response = await createPolicy(callWithRequest, request.payload);
        return response;
      } catch (err) {
        if (isEsError(err)) {
          return wrapEsError(err);
        }

        return wrapUnknownError(err);
      }
    },
    config: {
      pre: [licensePreRouting],
    },
  });
}
