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
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
import { ServerShimWithRouter } from '../../../types';
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

export function registerListRoute(server: ServerShimWithRouter) {
  const isEsError = isEsErrorFactory(server);
  const handler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    const callWithRequest = callWithRequestFactory(server, request);

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

  server.router.get(
    {
      path: '/api/watcher/watches',
      validate: false,
    },
    licensePreRoutingFactory(server, handler)
  );
}
