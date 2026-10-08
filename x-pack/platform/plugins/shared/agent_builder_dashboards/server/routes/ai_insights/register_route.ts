/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import { apiPrivileges } from '@kbn/agent-builder-plugin/common/features';
import { AI_INSIGHTS_API_PATH } from '../../../common/ai_insights/constants';
import type { AiInsightsRequestBody } from '../../../common/ai_insights/types';
import type { AgentBuilderDashboardsStartDependencies } from '../../types';
import { generateDashboardAiInsight } from './generate_dashboard_ai_insight';

const panelSchema = schema.object({
  id: schema.string({ maxLength: 256 }),
  title: schema.string({ maxLength: 1024, defaultValue: '' }),
  type: schema.string({ maxLength: 256 }),
  // Clients may serialize missing ES|QL as null; accept and ignore it.
  esql: schema.maybe(schema.nullable(schema.string({ maxLength: 20000 }))),
});

const dataSourceSchema = schema.object({
  id: schema.maybe(schema.nullable(schema.string({ maxLength: 256 }))),
  title: schema.string({ maxLength: 1024, defaultValue: '' }),
  index_pattern: schema.string({ maxLength: 1024 }),
  time_field: schema.maybe(schema.nullable(schema.string({ maxLength: 256 }))),
});

const bodySchema = schema.object({
  connector_id: schema.string({ maxLength: 256 }),
  dashboard: schema.object({
    title: schema.string({ maxLength: 1024, defaultValue: '' }),
    description: schema.string({ maxLength: 5000, defaultValue: '' }),
    panels: schema.arrayOf(panelSchema, { maxSize: 50 }),
    data_sources: schema.arrayOf(dataSourceSchema, { maxSize: 10, defaultValue: [] }),
  }),
  time_range: schema.object({
    from: schema.string({ maxLength: 256 }),
    to: schema.string({ maxLength: 256 }),
  }),
  query: schema.maybe(schema.nullable(schema.string({ maxLength: 5000 }))),
  search_query: schema.maybe(
    schema.nullable(
      schema.object({
        language: schema.string({ maxLength: 32 }),
        query: schema.string({ maxLength: 5000 }),
      })
    )
  ),
  // Dashboard/control filters are heterogeneous; keep this permissive and bounded.
  filters: schema.maybe(schema.arrayOf(schema.any(), { maxSize: 50 })),
  filters_summary: schema.maybe(schema.nullable(schema.string({ maxLength: 5000 }))),
});

export function registerAiInsightsRoute({
  router,
  coreSetup,
  logger,
}: {
  router: IRouter;
  coreSetup: CoreSetup<AgentBuilderDashboardsStartDependencies>;
  logger: Logger;
}): void {
  router.versioned
    .post({
      path: AI_INSIGHTS_API_PATH,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [apiPrivileges.readAgentBuilder],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: bodySchema,
          },
        },
      },
      async (context, request, response) => {
        const body = request.body as AiInsightsRequestBody;

        if (!body.connector_id) {
          return response.badRequest({
            body: 'connector_id is required',
          });
        }

        try {
          const [coreStart, pluginsStart] = await coreSetup.getStartServices();
          const inferenceClient = pluginsStart.inference.getClient({
            request,
            bindTo: { connectorId: body.connector_id },
          });
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const currentUser = coreStart.security.authc.getCurrentUser(request);

          const insight = await generateDashboardAiInsight({
            inferenceClient,
            esClient,
            logger,
            body,
          });

          return response.ok({
            body: {
              ...insight,
              generated_by: currentUser?.username || undefined,
              generated_at: new Date().toISOString(),
            },
          });
        } catch (error) {
          logger.error(error);
          return response.customError({
            statusCode: 500,
            body: {
              message:
                error instanceof Error ? error.message : 'Failed to generate dashboard AI insights',
            },
          });
        }
      }
    );
}
