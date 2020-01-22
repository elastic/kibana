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
import { API_BASE_PATH } from '../../../common';
import { RouteDependencies, ServerShim } from '../../types';

export function registerSearchRoute(deps: RouteDependencies, legacy: ServerShim) {
  const handler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    const callWithRequest = callWithRequestFactory(deps.elasticsearchService, request);
    try {
      const requests = request.body.map(({ index, query }: { index: string; query: any }) =>
        callWithRequest('rollup.search', {
          index,
          rest_total_hits_as_int: true,
          body: query,
        })
      );
      const data = await Promise.all(requests);
      return response.ok({ body: data });
    } catch (err) {
      if (isEsError(err)) {
        return response.customError({ statusCode: err.statusCode, body: err });
      }
      return response.internalError({ body: err });
    }
  };

  deps.router.post(
    {
      path: `${API_BASE_PATH}/search`,
      validate: {
        body: schema.arrayOf(
          schema.object({
            index: schema.string(),
            query: schema.any(),
          })
        ),
      },
    },
    licensePreRoutingFactory(legacy, handler)
  );
}
