/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchWatchesWithPagination } from '../../../lib/fetch_watches_with_pagination';
import { Watch } from '../../../models/watch';
import { RouteDependencies } from '../../../types';
import { QUERY_WATCHES_PAGINATION } from '../../../../common/constants';

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
        const responseWatches = await fetchWatchesWithPagination(
          esClient,
          QUERY_WATCHES_PAGINATION.PAGE_SIZE
        );
        const watches = responseWatches.map(({ _id, watch, status }) => {
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
