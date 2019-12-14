/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reduce, size } from 'lodash';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

function getIndexNamesFromAliasesResponse(json) {
  return reduce(
    json,
    (list, { aliases }, indexName) => {
      list.push(indexName);
      if (size(aliases) > 0) {
        list.push(...Object.keys(aliases));
      }
      return list;
    },
    []
  );
}

function getIndices(callWithRequest, pattern, limit = 10) {
  return callWithRequest('indices.getAlias', {
    index: pattern,
    ignore: [404],
  }).then(aliasResult => {
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

    return callWithRequest('search', params).then(response => {
      if (response.status === 404 || !response.aggregations) {
        return [];
      }
      return response.aggregations.indices.buckets.map(bucket => bucket.key);
    });
  });
}

export function registerGetRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/watcher/indices',
    method: 'POST',
    handler: request => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { pattern } = request.payload;

      return getIndices(callWithRequest, pattern)
        .then(indices => {
          return { indices };
        })
        .catch(err => {
          // Case: Error from Elasticsearch JS client
          if (isEsError(err)) {
            throw wrapEsError(err);
          }

          // Case: default
          throw wrapUnknownError(err);
        });
    },
    config: {
      pre: [licensePreRouting],
    },
  });
}
