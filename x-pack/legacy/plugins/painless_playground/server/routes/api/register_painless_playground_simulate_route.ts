/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapEsError } from '../../lib/error_wrappers';
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';

function executeScript(callWithRequest: any, painlessJson: any) {
  return callWithRequest('scriptsPainlessExecute', {
    body: painlessJson,
  });
}

export function registerPainlessPlaygroundSimulateRoute(server: any) {
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/painless_playground/simulate',
    method: 'POST',
    handler: (request: any) => {
      const callWithRequest = callWithRequestFactory(server, request);

      return executeScript(callWithRequest, request.payload).catch((e: any) => wrapEsError(e));
    },
    config: {
      pre: [licensePreRouting],
    },
  });
}
