/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandler } from 'src/core/server';
import { reduce, size } from 'lodash';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsError } from '../../../lib/is_es_error';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
import { RouteDependencies, ServerShim } from '../../../types';

function getIndexNamesFromAliasesResponse(json: Record<string, any>) {
  return reduce(
    json,
    (list, { aliases }, indexName) => {
      list.push(indexName);
      if (size(aliases) > 0) {
        list.push(...Object.keys(aliases));
      }
      return list;
    },
    [] as string[]
  );
}

function getIndices(callWithRequest: any, pattern: string, limit = 10) {
  return callWithRequest('indices.getAlias', {
    index: pattern,
    ignore: [404],
  }).then((aliasResult: any) => {
    if (aliasResult.status !== 404) {
      const indicesFromAliasResponse = getIndexNamesFromAliasesResponse(aliasResult);
      return indicesFromAliasResponse.slice(0, limit);
    }

    const params = {
      index: pattern,
      ignore: [404],
      body: {
        size: 0, // no hits
        aggs: {
          indices: {
            terms: {
              field: '_index',
              size: limit,
            },
          },
        },
      },
    };

    return callWithRequest('search', params).then((response: any) => {
      if (response.status === 404 || !response.aggregations) {
        return [];
      }
      return response.aggregations.indices.buckets.map((bucket: any) => bucket.key);
    });
  });
}

export function registerGetRoute(deps: RouteDependencies, legacy: ServerShim) {
  const handler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    const callWithRequest = callWithRequestFactory(deps.elasticsearchService, request);
    const { pattern } = request.body;

    try {
      const indices = await getIndices(callWithRequest, pattern);
      return response.ok({ body: { indices } });
    } catch (e) {
      // Case: Error from Elasticsearch JS client
      if (isEsError(e)) {
        return response.customError({ statusCode: e.statusCode, body: e });
      }

      // Case: default
      return response.internalError({ body: e });
    }
  };

  deps.router.post(
    {
      path: '/api/watcher/indices',
      validate: {
        body: schema.object({}, { allowUnknowns: true }),
      },
    },
    licensePreRoutingFactory(legacy, handler)
  );
}
