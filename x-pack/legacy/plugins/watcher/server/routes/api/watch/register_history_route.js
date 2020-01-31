/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { fetchAllFromScroll } from '../../../lib/fetch_all_from_scroll';
import { INDEX_NAMES, ES_SCROLL_SETTINGS } from '../../../../common/constants';
import { WatchHistoryItem } from '../../../models/watch_history_item';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

function fetchHistoryItems(callWithRequest, watchId, startTime) {
  const params = {
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

  return callWithRequest('search', params).then(response =>
    fetchAllFromScroll(response, callWithRequest)
  );
}

export function registerHistoryRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/watcher/watch/{watchId}/history',
    method: 'GET',
    handler: request => {
      const callWithRequest = callWithRequestFactory(server, request);
      const { watchId } = request.params;
      const { startTime } = request.query;

      return fetchHistoryItems(callWithRequest, watchId, startTime)
        .then(hits => {
          const watchHistoryItems = hits.map(hit => {
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

          return {
            watchHistoryItems: watchHistoryItems.map(
              watchHistoryItem => watchHistoryItem.downstreamJson
            ),
          };
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
