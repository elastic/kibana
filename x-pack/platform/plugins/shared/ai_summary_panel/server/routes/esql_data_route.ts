/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { runEsqlQuery } from '../utils/esql_query';

const MAX_ROWS = 1_000;

export function registerEsqlDataRoute(router: IRouter) {
  router.post(
    {
      path: '/internal/ai_summary_panel/esql_data',
      security: {
        authz: { enabled: false, reason: 'Scoped to current user via esClient' },
      },
      options: { access: 'internal' },
      validate: {
        body: schema.object({
          esqlQuery: schema.string({ minLength: 1, maxLength: 1_000_000 }),
          timeRange: schema.maybe(schema.object({ from: schema.string(), to: schema.string() })),
        }),
      },
    },
    async (context, request, response) => {
      const { esqlQuery, timeRange } = request.body;
      const esClient = (await context.core).elasticsearch.client.asCurrentUser;
      try {
        const { columns, rows } = await runEsqlQuery(esClient, esqlQuery, timeRange);
        return response.ok({ body: { columns, rows: rows.slice(0, MAX_ROWS) } });
      } catch (err) {
        return response.badRequest({ body: err instanceof Error ? err.message : String(err) });
      }
    }
  );
}
