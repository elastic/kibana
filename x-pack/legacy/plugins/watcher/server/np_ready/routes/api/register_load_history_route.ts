/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { get } from 'lodash';
import { RequestHandler } from 'src/core/server';
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsError } from '../../lib/is_es_error';
import { INDEX_NAMES } from '../../../../common/constants';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';
import { RouteDependencies, ServerShim } from '../../types';
// @ts-ignore
import { WatchHistoryItem } from '../../models/watch_history_item';

function fetchHistoryItem(callWithRequest: any, watchHistoryItemId: string) {
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

export function registerLoadHistoryRoute(deps: RouteDependencies, legacy: ServerShim) {
  const handler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    const callWithRequest = callWithRequestFactory(deps.elasticsearchService, request);
    const id = request.params.id;

    try {
      const responseFromES = await fetchHistoryItem(callWithRequest, id);
      const hit = get(responseFromES, 'hits.hits[0]');
      if (!hit) {
        return response.notFound({ body: `Watch History Item with id = ${id} not found` });
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
      return response.ok({
        body: { watchHistoryItem: watchHistoryItem.downstreamJson },
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
      path: '/api/watcher/history/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    licensePreRoutingFactory(legacy, handler)
  );
}
