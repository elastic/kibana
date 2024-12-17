/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IScopedClusterClient } from '@kbn/core/server';
import { get } from 'lodash';

import { RouteDependencies } from '../../../types';
import {
  buildServerWatchStatusModel,
  buildClientWatchStatusModel,
} from '../../../models/watch_status_model';

function activateWatch(dataClient: IScopedClusterClient, watchId: string) {
  return dataClient.asCurrentUser.watcher.activateWatch({
    watch_id: watchId,
  });
}

const paramsSchema = schema.object({
  watchId: schema.string(),
});

export function registerActivateRoute({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) {
  router.put(
    {
      path: '/api/watcher/watch/{watchId}/activate',
      validate: {
        params: paramsSchema,
      },
    },
    license.guardApiRoute(async (ctx, request, response) => {
      const { watchId } = request.params;

      try {
        const esClient = (await ctx.core).elasticsearch.client;
        const hit = await activateWatch(esClient, watchId);
        const watchStatusJson = get(hit, 'status');
        const json = {
          id: watchId,
          watchStatusJson,
        };

        const watchStatus = buildServerWatchStatusModel(json);
        return response.ok({
          body: {
            watchStatus: buildClientWatchStatusModel(watchStatus),
          },
        });
      } catch (e) {
        if (e?.statusCode === 404 && e.meta?.body?.error) {
          e.meta.body.error.reason = `Watch with id = ${watchId} not found`;
        }
        return handleEsError({ error: e, response });
      }
    })
  );
}
