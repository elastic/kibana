/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter, Logger, RequestHandlerContext } from '@kbn/core/server';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import { dashboardAttachmentDataSchema } from '@kbn/agent-builder-dashboards-common';
import type { AgentBuilderDashboardsStartDependencies } from '../types';
import {
  dashboardOperationSchema,
  executeDashboardOperations,
} from '../tools/manage_dashboard/operations';
import { createVisualizationResolver } from '../tools/manage_dashboard/inline_visualization';

const noopEvents: ToolEventEmitter = {
  reportProgress: () => {},
  sendUiEvent: () => {},
};

const requestBodySchema = z.object({
  dashboardData: dashboardAttachmentDataSchema.optional(),
  operations: z.array(dashboardOperationSchema).min(1),
});

export const registerManageDashboardRoute = (
  router: IRouter<RequestHandlerContext>,
  logger: Logger,
  coreSetup: CoreSetup<AgentBuilderDashboardsStartDependencies>
) => {
  router.versioned
    .post({
      path: '/api/agent_builder_dashboards/manage_dashboard',
      access: 'public',
      security: {
        authz: {
          enabled: false,
          reason: 'PoC route — authorization deferred',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidationWithZod(requestBodySchema),
          },
        },
      },
      async (context, request, response) => {
        const { dashboardData, operations } = request.body;

        try {
          const [, startDeps] = await coreSetup.getStartServices();
          const { elasticsearch } = await context.core;

          const modelProvider = startDeps.agentBuilder.runtime.createModelProvider({ request });

          const resolveVisualizationConfig = createVisualizationResolver({
            logger,
            modelProvider,
            events: noopEvents,
            esClient: elasticsearch.client,
          });

          const result = await executeDashboardOperations({
            dashboardData,
            operations,
            logger,
            resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
            resolveVisualizationConfig,
          });

          return response.ok({ body: result });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.error(`manage_dashboard route error: ${message}`);
          return response.badRequest({ body: { message } });
        }
      }
    );
};
