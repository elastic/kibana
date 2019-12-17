/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { wrapUnknownError } from '../../../lib/error_wrappers';
import { INDEX_NAMES } from '../../../../common/constants';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

function doesIndexExist(callWithRequest) {
  return callWithRequest('indices.exists', {
    index: INDEX_NAMES.PIPELINES,
  });
}

async function executeUpgrade(callWithRequest) {
  // If index doesn't exist yet, there is no mapping to upgrade
  if (!(await doesIndexExist(callWithRequest))) {
    return;
  }

  return callWithRequest('indices.putMapping', {
    index: INDEX_NAMES.PIPELINES,
    body: {
      properties: {
        pipeline_settings: {
          dynamic: false,
          type: 'object',
        },
      },
    },
  });
}

export function registerExecuteRoute(server) {
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/logstash/upgrade',
    method: 'POST',
    handler: async request => {
      const callWithRequest = callWithRequestFactory(server, request);
      try {
        await executeUpgrade(callWithRequest);
        return { is_upgraded: true };
      } catch (err) {
        throw wrapUnknownError(err);
      }
    },
    config: {
      pre: [licensePreRouting],
    },
  });
}
