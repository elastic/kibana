/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapEsError } from '../../../lib/error_wrappers';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { GrokdebuggerRequest } from '../../../models/grokdebugger_request';
import { GrokdebuggerResponse } from '../../../models/grokdebugger_response';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

function simulateGrok(callWithRequest, ingestJson) {
  return callWithRequest('ingest.simulate', {
    body: ingestJson,
  });
}

export function registerGrokSimulateRoute(server) {
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/grokdebugger/simulate',
    method: 'POST',
    handler: request => {
      const callWithRequest = callWithRequestFactory(server, request);
      const grokdebuggerRequest = GrokdebuggerRequest.fromDownstreamJSON(request.payload);
      return simulateGrok(callWithRequest, grokdebuggerRequest.upstreamJSON)
        .then(simulateResponseFromES => {
          const grokdebuggerResponse = GrokdebuggerResponse.fromUpstreamJSON(
            simulateResponseFromES
          );
          return { grokdebuggerResponse };
        })
        .catch(e => wrapEsError(e));
    },
    config: {
      pre: [licensePreRouting],
    },
  });
}
