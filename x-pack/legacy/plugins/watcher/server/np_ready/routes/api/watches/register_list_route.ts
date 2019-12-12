/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'src/core/server';
import { get } from 'lodash';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { fetchAllFromScroll } from '../../../lib/fetch_all_from_scroll';
import { INDEX_NAMES, ES_SCROLL_SETTINGS } from '../../../../../common/constants';
import { isEsError } from '../../../lib/is_es_error';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
import { RouteDependencies, ServerShim } from '../../../types';
// @ts-ignore
import { Watch } from '../../../models/watch';

function fetchWatches(callWithRequest: any) {
  const params = {
    index: INDEX_NAMES.WATCHES,
    scroll: ES_SCROLL_SETTINGS.KEEPALIVE,
    body: {
      size: ES_SCROLL_SETTINGS.PAGE_SIZE,
    },
    ignore: [404],
  };

  return callWithRequest('search', params).then((response: any) =>
    fetchAllFromScroll(response, callWithRequest)
  );
}

export function registerListRoute(deps: RouteDependencies, legacy: ServerShim) {
  const handler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    const callWithRequest = callWithRequestFactory(deps.elasticsearchService, request);

    try {
      const hits = await fetchWatches(callWithRequest);
      const watches = hits.map((hit: any) => {
        const id = get(hit, '_id');
        const watchJson = get(hit, '_source');
        const watchStatusJson = get(hit, '_source.status');

        return Watch.fromUpstreamJson(
          {
            id,
            watchJson,
            watchStatusJson,
          },
          {
            throwExceptions: {
              Action: false,
            },
          }
        );
      });

      return response.ok({
        body: {
          watches: watches.map((watch: any) => watch.downstreamJson),
        },
      });
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

  deps.router.get(
    {
      path: '/api/watcher/watches',
      validate: false,
    },
    licensePreRoutingFactory(legacy, handler)
  );
}
