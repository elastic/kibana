/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsError } from '../../../lib/is_es_error';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

async function fetchTemplate(callWithRequest: any, templateName: string): Promise<any> {
  const params = {
    method: 'GET',
    path: `/_template/${encodeURIComponent(templateName)}`,
    // we allow 404 incase the user shutdown security in-between the check and now
    ignore: [404],
  };

  return await callWithRequest('transport.request', params);
}

export function registerGetRoute(server: any) {
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/index_lifecycle_management/templates/{templateName}',
    method: 'GET',
    handler: async (request: any) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const templateName = request.params.templateName;

      try {
        const template = await fetchTemplate(callWithRequest, templateName);
        return template[templateName];
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
