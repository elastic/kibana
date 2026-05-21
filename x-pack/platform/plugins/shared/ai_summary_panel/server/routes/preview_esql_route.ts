/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import dateMath from '@kbn/datemath';

export function registerPreviewEsqlRoute(router: IRouter) {
  router.post(
    {
      path: '/internal/ai_summary_panel/preview_esql',
      security: {
        authz: { enabled: false, reason: 'Scoped to current user via esClient' },
      },
      options: { access: 'internal' },
      validate: {
        body: schema.object({
          esqlQuery: schema.string(),
          timeRange: schema.maybe(
            schema.object({ from: schema.string(), to: schema.string() })
          ),
        }),
      },
    },
    async (context, request, response) => {
      const { esqlQuery, timeRange } = request.body;
      const esClient = (await context.core).elasticsearch.client;

      const esqlParams = timeRange
        ? [
            { _tstart: dateMath.parse(timeRange.from)?.toISOString() ?? timeRange.from },
            { _tend: dateMath.parse(timeRange.to, { roundUp: true })?.toISOString() ?? timeRange.to },
          ]
        : undefined;

      try {
        const result = await esClient.asCurrentUser.esql.query({
          query: esqlQuery,
          ...(esqlParams ? { params: esqlParams } : {}),
        });
        return response.ok({
          body: {
            columns: result.columns as Array<{ name: string; type: string }>,
            rows: (result.values as unknown[][]).slice(0, 10),
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return response.badRequest({ body: msg });
      }
    }
  );
}
