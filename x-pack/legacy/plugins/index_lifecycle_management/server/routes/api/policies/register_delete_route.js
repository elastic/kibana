/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

async function deletePolicies(policyNames, callWithRequest) {
  const params = {
    method: 'DELETE',
    path: `/_ilm/policy/${encodeURIComponent(policyNames)}`,
    // we allow 404 since they may have no policies
    ignore: [404],
  };

  return await callWithRequest('transport.request', params);
}

export function registerDeleteRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/index_lifecycle_management/policies/{policyNames}',
    method: 'DELETE',
    handler: async request => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { policyNames } = request.params;
      try {
        await deletePolicies(policyNames, callWithRequest);
        return {};
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
