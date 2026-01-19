/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { SearchConnectorsPluginSetupDependencies } from '../types';
import { elasticsearchErrorHandler } from '../utils/elasticsearch_error_handler';
import { fetchSyncJobsStats } from '../lib/stats/get_sync_jobs';

export function registerStatsRoutes({ router, log }: SearchConnectorsPluginSetupDependencies) {
  router.get(
    {
      path: '/internal/content_connectors/stats/sync_jobs',
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {
        query: schema.object({
          isCrawler: schema.maybe(schema.boolean()),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { isCrawler } = request.query;
      const body = await fetchSyncJobsStats(client, isCrawler);
      return response.ok({ body });
    })
  );
}
