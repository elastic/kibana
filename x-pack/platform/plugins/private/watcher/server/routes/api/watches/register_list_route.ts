/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { WatcherQueryWatchesRequest } from '@elastic/elasticsearch/lib/api/types';
import { RouteDependencies } from '../../../types';
import { Watch } from '../../../models/watch';

const querySchema = schema.object({
  pageSize: schema.number(),
  pageIndex: schema.number(),
  sortField: schema.maybe(schema.string()),
  sortDirection: schema.maybe(schema.string()),
  query: schema.string(),
});

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
      validate: {
        query: querySchema,
      },
    },
    license.guardApiRoute(async (ctx, request, response) => {
      try {
        const { pageSize, pageIndex, sortField, sortDirection, query } = request.query;
        const esClient = (await ctx.core).elasticsearch.client;
        const body: WatcherQueryWatchesRequest = {
          from: pageIndex * pageSize,
          size: pageSize,
        };
        if (sortField && sortDirection) {
          const order: 'asc' | 'desc' = sortDirection === 'desc' ? 'desc' : 'asc';
          // The Query Watch API only allows sorting by metadata.* fields
          body.sort = [
            {
              [`metadata.${sortField}.keyword`]: {
                order,
              },
            },
          ];
        }
        if (query) {
          // The Query Watch API only allows searching by _id or by metadata.* fields
          body.query = {
            bool: {
              should: [
                {
                  wildcard: {
                    ['metadata.name.keyword']: `*${query}*`,
                  },
                },
                {
                  match: {
                    _id: {
                      query,
                    },
                  },
                },
              ],
            },
          };
        }
        const { watches: hits, count } = await esClient.asCurrentUser.watcher.queryWatches(body);
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
            watchCount: count,
          },
        });
      } catch (e) {
        return handleEsError({ error: e, response });
      }
    })
  );
}
