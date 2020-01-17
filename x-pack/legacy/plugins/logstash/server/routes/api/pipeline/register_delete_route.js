/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { wrapEsError } from '../../../lib/error_wrappers';
import { INDEX_NAMES } from '../../../../common/constants';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

function deletePipeline(callWithRequest, pipelineId) {
  return callWithRequest('delete', {
    index: INDEX_NAMES.PIPELINES,
    id: pipelineId,
    refresh: 'wait_for',
  });
}

export function registerDeleteRoute(server) {
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/logstash/pipeline/{id}',
    method: 'DELETE',
    handler: (request, h) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const pipelineId = request.params.id;

      return deletePipeline(callWithRequest, pipelineId)
        .then(() => h.response().code(204))
        .catch(e => wrapEsError(e));
    },
    config: {
      pre: [licensePreRouting],
    },
  });
}
