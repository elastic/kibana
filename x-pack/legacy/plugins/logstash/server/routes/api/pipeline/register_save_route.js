/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { wrapEsError } from '../../../lib/error_wrappers';
import { INDEX_NAMES } from '../../../../common/constants';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { Pipeline } from '../../../models/pipeline';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

function savePipeline(callWithRequest, pipelineId, pipelineBody) {
  return callWithRequest('index', {
    index: INDEX_NAMES.PIPELINES,
    id: pipelineId,
    body: pipelineBody,
    refresh: 'wait_for',
  });
}

export function registerSaveRoute(server) {
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/logstash/pipeline/{id}',
    method: 'PUT',
    handler: async (request, h) => {
      let username;
      if (server.plugins.security) {
        const user = await server.plugins.security.getUser(request);
        username = get(user, 'username');
      }

      const callWithRequest = callWithRequestFactory(server, request);
      const pipelineId = request.params.id;

      const pipeline = Pipeline.fromDownstreamJSON(request.payload, pipelineId, username);
      return savePipeline(callWithRequest, pipeline.id, pipeline.upstreamJSON)
        .then(() => h.response().code(204))
        .catch(e => wrapEsError(e));
    },
    config: {
      pre: [licensePreRouting],
    },
  });
}
