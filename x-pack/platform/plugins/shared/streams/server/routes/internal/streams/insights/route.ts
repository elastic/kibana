/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { InsightsResult } from '@kbn/streams-schema';
import type { InsightsDiscoveryTaskParams } from '../../../../lib/tasks/task_definitions/insights_discovery';
import { STREAMS_INSIGHTS_DISCOVERY_TASK_TYPE } from '../../../../lib/tasks/task_definitions/insights_discovery';
import type { TaskResult } from '../../../../lib/tasks/types';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { handleTaskAction } from '../../../utils/task_helpers';
import { resolveConnectorId } from '../../../utils/resolve_connector_id';
import type { PersistedInsight } from '../../../../lib/significant_events/insights';
import { insightInputSchema } from '../../../../lib/significant_events/insights';

export type InsightsTaskResult = TaskResult<InsightsResult>;

const insightsTaskRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_insights/_task',
  options: {
    access: 'internal',
    summary: 'Identify insights in streams',
    description: 'Identify insights in streams based on significant events',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('schedule').describe('Schedule a new generation task'),
        connectorId: z
          .string()
          .optional()
          .describe(
            'Optional connector ID. If not provided, the default AI connector from settings will be used.'
          ),
      }),
      z.object({
        action: z.literal('cancel').describe('Cancel an in-progress generation task'),
      }),
      z.object({
        action: z.literal('acknowledge').describe('Acknowledge a completed generation task'),
      }),
    ]),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<InsightsTaskResult> => {
    const { licensing, uiSettingsClient, taskClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { body } = params;

    const actionParams =
      body.action === 'schedule'
        ? ({
            action: body.action,
            scheduleConfig: {
              taskType: STREAMS_INSIGHTS_DISCOVERY_TASK_TYPE,
              taskId: STREAMS_INSIGHTS_DISCOVERY_TASK_TYPE,
              params: await (async (): Promise<InsightsDiscoveryTaskParams> => {
                const connectorId = await resolveConnectorId({
                  connectorId: body.connectorId,
                  uiSettingsClient,
                  logger,
                });

                return {
                  connectorId,
                };
              })(),
              request,
            },
          } as const)
        : ({ action: body.action } as const);

    return handleTaskAction<InsightsDiscoveryTaskParams, InsightsResult>({
      taskClient,
      taskId: STREAMS_INSIGHTS_DISCOVERY_TASK_TYPE,
      ...actionParams,
    });
  },
});

const insightsStatusRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_insights/_status',
  options: {
    access: 'internal',
    summary: 'Check the status of insights identification',
    description: 'Check the status of insights identification',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ request, getScopedClients, server }): Promise<InsightsTaskResult> => {
    const { licensing, uiSettingsClient, taskClient } = await getScopedClients({
      request,
    });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return taskClient.getStatus<InsightsDiscoveryTaskParams, InsightsResult>(
      STREAMS_INSIGHTS_DISCOVERY_TASK_TYPE
    );
  },
});

// CRUD Routes for persisted insights

const listInsightsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_insights',
  options: {
    access: 'internal',
    summary: 'List all insights',
    description: 'Fetches all persisted insights with optional filters',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: z.object({
      impact: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Filter by impact level(s). Can be a single value or comma-separated values.'),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ insights: PersistedInsight[]; total: number }> => {
    const { insightClient, licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const filters: { impact?: string[] } = {};
    if (params.query.impact) {
      // Support both array and comma-separated string
      filters.impact = Array.isArray(params.query.impact)
        ? params.query.impact
        : params.query.impact.split(',');
    }

    const { hits, total } = await insightClient.list(filters);
    return { insights: hits, total };
  },
});

const getInsightRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_insights/{id}',
  options: {
    access: 'internal',
    summary: 'Get a single insight',
    description: 'Fetches a single insight by ID',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ id: z.string() }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ insight: PersistedInsight }> => {
    const { insightClient, licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const insight = await insightClient.get(params.path.id);
    return { insight };
  },
});

const saveInsightRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/_insights/{id}',
  options: {
    access: 'internal',
    summary: 'Save an insight',
    description: 'Creates or updates a persisted insight by ID',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ id: z.string() }),
    body: insightInputSchema,
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ insight: PersistedInsight }> => {
    const { insightClient, licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const insight = await insightClient.save(params.path.id, params.body);
    return { insight };
  },
});

const deleteInsightRoute = createServerRoute({
  endpoint: 'DELETE /internal/streams/_insights/{id}',
  options: {
    access: 'internal',
    summary: 'Delete an insight',
    description: 'Deletes an existing insight by ID',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ id: z.string() }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ acknowledged: boolean }> => {
    const { insightClient, licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return await insightClient.delete(params.path.id);
  },
});

const bulkInsightsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_insights/_bulk',
  options: {
    access: 'internal',
    summary: 'Bulk operations on insights',
    description: 'Perform bulk save or delete operations on insights',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      operations: z.array(
        z.union([
          z.object({
            index: z.object({
              insight: insightInputSchema,
              id: z.string().optional(),
            }),
          }),
          z.object({
            delete: z.object({ id: z.string() }),
          }),
        ])
      ),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ acknowledged: boolean }> => {
    const { insightClient, licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return await insightClient.bulk(params.body.operations);
  },
});

export const internalInsightsRoutes = {
  ...insightsTaskRoute,
  ...insightsStatusRoute,
  ...listInsightsRoute,
  ...getInsightRoute,
  ...saveInsightRoute,
  ...deleteInsightRoute,
  ...bulkInsightsRoute,
};
