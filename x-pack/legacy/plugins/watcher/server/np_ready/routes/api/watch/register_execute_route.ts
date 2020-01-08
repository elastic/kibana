/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandler } from 'src/core/server';
import { get } from 'lodash';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsError } from '../../../lib/is_es_error';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

import { RouteDependencies, ServerShim } from '../../../types';
// @ts-ignore
import { ExecuteDetails } from '../../../models/execute_details';
// @ts-ignore
import { Watch } from '../../../models/watch';
// @ts-ignore
import { WatchHistoryItem } from '../../../models/watch_history_item';

function executeWatch(callWithRequest: any, executeDetails: any, watchJson: any) {
  const body = executeDetails;
  body.watch = watchJson;

  return callWithRequest('watcher.executeWatch', {
    body,
  });
}

export function registerExecuteRoute(deps: RouteDependencies, legacy: ServerShim) {
  const handler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    const callWithRequest = callWithRequestFactory(deps.elasticsearchService, request);
    const executeDetails = ExecuteDetails.fromDownstreamJson(request.body.executeDetails);
    const watch = Watch.fromDownstreamJson(request.body.watch);

    try {
      const hit = await executeWatch(callWithRequest, executeDetails.upstreamJson, watch.watchJson);
      const id = get(hit, '_id');
      const watchHistoryItemJson = get(hit, 'watch_record');
      const watchId = get(hit, 'watch_record.watch_id');
      const json = {
        id,
        watchId,
        watchHistoryItemJson,
        includeDetails: true,
      };

      const watchHistoryItem = WatchHistoryItem.fromUpstreamJson(json);
      return response.ok({
        body: {
          watchHistoryItem: watchHistoryItem.downstreamJson,
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

  deps.router.put(
    {
      path: '/api/watcher/watch/execute',
      validate: {
        body: schema.object({
          executeDetails: schema.object({}, { allowUnknowns: true }),
          watch: schema.object({}, { allowUnknowns: true }),
        }),
      },
    },
    licensePreRoutingFactory(legacy, handler)
  );
}
