/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { WatchHistoryItem } from '../../../models/watch_history_item';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError, wrapCustomError } from '../../../lib/error_wrappers';
import { INDEX_NAMES } from '../../../../common/constants';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

function fetchHistoryItem(callWithRequest, watchHistoryItemId) {
  return callWithRequest('search', {
    index: INDEX_NAMES.WATCHER_HISTORY,
    body: {
      query: {
        bool: {
          must: [{ term: { _id: watchHistoryItemId } }],
        },
      },
    },
  });
}

export function registerLoadRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/watcher/history/{id}',
    method: 'GET',
    handler: request => {
      const callWithRequest = callWithRequestFactory(server, request);
      const id = request.params.id;

      return fetchHistoryItem(callWithRequest, id)
        .then(responseFromES => {
          const hit = get(responseFromES, 'hits.hits[0]');
          if (!hit) {
            throw wrapCustomError(new Error(`Watch History Item with id = ${id} not found`), 404);
          }

          const watchHistoryItemJson = get(hit, '_source');
          const watchId = get(hit, '_source.watch_id');
          const json = {
            id,
            watchId,
            watchHistoryItemJson,
            includeDetails: true,
          };

          const watchHistoryItem = WatchHistoryItem.fromUpstreamJson(json);
          return {
            watchHistoryItem: watchHistoryItem.downstreamJson,
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
