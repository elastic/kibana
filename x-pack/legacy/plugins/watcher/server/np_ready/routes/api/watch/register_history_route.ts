/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandler } from 'src/core/server';
import { get } from 'lodash';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { fetchAllFromScroll } from '../../../lib/fetch_all_from_scroll';
import { INDEX_NAMES, ES_SCROLL_SETTINGS } from '../../../../../common/constants';
import { isEsError } from '../../../lib/is_es_error';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
import { RouteDependencies, ServerShim } from '../../../types';
// @ts-ignore
import { WatchHistoryItem } from '../../../models/watch_history_item';

function fetchHistoryItems(callWithRequest: any, watchId: any, startTime: any) {
  const params: any = {
    index: INDEX_NAMES.WATCHER_HISTORY,
    scroll: ES_SCROLL_SETTINGS.KEEPALIVE,
    body: {
      size: ES_SCROLL_SETTINGS.PAGE_SIZE,
      sort: [{ 'result.execution_time': 'desc' }],
      query: {
        bool: {
          must: [{ term: { watch_id: watchId } }],
        },
      },
    },
  };

  // Add time range clause to query if startTime is specified
  if (startTime !== 'all') {
    const timeRangeQuery = { range: { 'result.execution_time': { gte: startTime } } };
    params.body.query.bool.must.push(timeRangeQuery);
  }

  return callWithRequest('search', params).then((response: any) =>
    fetchAllFromScroll(response, callWithRequest)
  );
}

export function registerHistoryRoute(deps: RouteDependencies, legacy: ServerShim) {
  const handler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    const callWithRequest = callWithRequestFactory(deps.elasticsearchService, request);
    const { watchId } = request.params;
    const { startTime } = request.query;

    try {
      const hits = await fetchHistoryItems(callWithRequest, watchId, startTime);
      const watchHistoryItems = hits.map((hit: any) => {
        const id = get(hit, '_id');
        const watchHistoryItemJson = get(hit, '_source');

        const opts = { includeDetails: false };
        return WatchHistoryItem.fromUpstreamJson(
          {
            id,
            watchId,
            watchHistoryItemJson,
          },
          opts
        );
      });

      return response.ok({
        body: {
          watchHistoryItems: watchHistoryItems.map(
            (watchHistoryItem: any) => watchHistoryItem.downstreamJson
          ),
        },
      });
    } catch (e) {
      // Case: Error from Elasticsearch JS client
      if (isEsError(e)) {
        return response.customError({ statusCode: e.statusCode, body: e });
      }

      // Case: default
      return response.internalError({ body: e });
    }
  };

  deps.router.get(
    {
      path: '/api/watcher/watch/{watchId}/history',
      validate: {
        params: schema.object({
          watchId: schema.string(),
        }),
      },
    },
    licensePreRoutingFactory(legacy, handler)
  );
}
