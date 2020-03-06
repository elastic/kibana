/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge } from 'lodash';

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsError } from '../../../lib/is_es_error';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

async function getIndexTemplate(callWithRequest: any, templateName: string): Promise<any> {
  const response = await callWithRequest('indices.getTemplate', { name: templateName });
  return response[templateName];
}

async function updateIndexTemplate(callWithRequest: any, indexTemplatePatch: any): Promise<any> {
  // Fetch existing template
  const template = await getIndexTemplate(callWithRequest, indexTemplatePatch.templateName);
  merge(template, {
    settings: {
      index: {
        lifecycle: {
          name: indexTemplatePatch.policyName,
          rollover_alias: indexTemplatePatch.aliasName,
        },
      },
    },
  });

  const params = {
    method: 'PUT',
    path: `/_template/${encodeURIComponent(indexTemplatePatch.templateName)}`,
    ignore: [404],
    body: template,
  };

  return await callWithRequest('transport.request', params);
}

export function registerAddPolicyRoute(server: any) {
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/index_lifecycle_management/template',
    method: 'POST',
    handler: async (request: any) => {
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const response = await updateIndexTemplate(callWithRequest, request.payload);
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
