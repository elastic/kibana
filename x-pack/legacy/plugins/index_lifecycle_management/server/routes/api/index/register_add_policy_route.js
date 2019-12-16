/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

async function addLifecyclePolicy(callWithRequest, indexName, policyName, alias) {
  const body = {
    lifecycle: {
      name: policyName,
      rollover_alias: alias,
    },
  };

  const params = {
    method: 'PUT',
    path: `/${encodeURIComponent(indexName)}/_settings`,
    body,
  };

  return callWithRequest('transport.request', params);
}

export function registerAddPolicyRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/index_lifecycle_management/index/add',
    method: 'POST',
    handler: async request => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { indexName, policyName, alias } = request.payload;
      try {
        const response = await addLifecyclePolicy(callWithRequest, indexName, policyName, alias);
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
