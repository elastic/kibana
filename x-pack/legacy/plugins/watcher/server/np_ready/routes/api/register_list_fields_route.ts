/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandler } from 'src/core/server';
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsError } from '../../lib/is_es_error';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';
// @ts-ignore
import { Fields } from '../../models/fields';
import { RouteDependencies, ServerShim } from '../../types';

function fetchFields(callWithRequest: any, indexes: string[]) {
  const params = {
    index: indexes,
    fields: ['*'],
    ignoreUnavailable: true,
    allowNoIndices: true,
    ignore: 404,
  };

  return callWithRequest('fieldCaps', params);
}

export function registerListFieldsRoute(deps: RouteDependencies, legacy: ServerShim) {
  const handler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    const callWithRequest = callWithRequestFactory(deps.elasticsearchService, request);
    const { indexes } = request.body;

    try {
      const fieldsResponse = await fetchFields(callWithRequest, indexes);
      const json = fieldsResponse.status === 404 ? { fields: [] } : fieldsResponse;
      const fields = Fields.fromUpstreamJson(json);
      return response.ok({ body: fields.downstreamJson });
    } catch (e) {
      // Case: Error from Elasticsearch JS client
      if (isEsError(e)) {
        return response.customError({
          statusCode: e.statusCode,
          body: {
            message: e.message,
          },
        });
      }

      // Case: default
      return response.internalError({ body: e });
    }
  };

  deps.router.post(
    {
      path: '/api/watcher/fields',
      validate: {
        body: schema.object({
          indexes: schema.arrayOf(schema.string()),
        }),
      },
    },
    licensePreRoutingFactory(legacy, handler)
  );
}
