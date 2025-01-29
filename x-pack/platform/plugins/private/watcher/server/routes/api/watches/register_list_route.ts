/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../../../types';
import { Watch } from '../../../models/watch';

export function registerListRoute({ router, license, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    {
      path: '/api/watcher/watches',
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: false,
    },
    license.guardApiRoute(async (ctx, request, response) => {
      try {
        const esClient = (await ctx.core).elasticsearch.client;
        const { watches: hits } = await esClient.asCurrentUser.watcher.queryWatches();
        const watches = hits.map(({ _id, watch, status }) => {
          return Watch.fromUpstreamJson(
            {
              id: _id,
              watchJson: watch,
              watchStatusJson: status,
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
            watches: watches.map((watch) => watch.downstreamJson),
          },
        });
      } catch (e) {
        return handleEsError({ error: e, response });
      }
    })
  );
}
