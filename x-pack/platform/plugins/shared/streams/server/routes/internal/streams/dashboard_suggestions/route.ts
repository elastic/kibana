/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { DashboardSuggestionResult, TaskResult } from '@kbn/streams-schema';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { resolveConnectorId } from '../../../utils/resolve_connector_id';
import {
  type DashboardSuggestionTaskParams,
  getDashboardSuggestionTaskId,
  STREAMS_DASHBOARD_SUGGESTION_TASK_TYPE,
} from '../../../../lib/tasks/task_definitions/dashboard_suggestion';
import { taskActionSchema } from '../../../../lib/tasks/task_action_schema';
import { handleTaskAction } from '../../../utils/task_helpers';

export type DashboardSuggestionTaskResult = TaskResult<DashboardSuggestionResult>;

export const dashboardSuggestionStatusRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/dashboard_suggestions/_status',
  options: {
    access: 'internal',
    summary: 'Check the status of dashboard suggestion generation',
    description:
      'Dashboard suggestion generation happens as a background task, this endpoint allows checking the status of this task.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<DashboardSuggestionTaskResult> => {
    const { streamsClient, licensing, uiSettingsClient, taskClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { name } = params.path;
    await streamsClient.ensureStream(name);

    return await taskClient.getStatus<DashboardSuggestionTaskParams, DashboardSuggestionResult>(
      getDashboardSuggestionTaskId(name)
    );
  },
});

export const dashboardSuggestionTaskRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/dashboard_suggestions/_task',
  options: {
    access: 'internal',
    summary: 'Generate dashboard suggestions for a stream',
    description:
      'Generate dashboard suggestions for a stream using an LLM. This happens as a background task and this endpoint manages the task lifecycle.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
    body: taskActionSchema({
      connector_id: z
        .string()
        .optional()
        .describe(
          'Optional connector ID. If not provided, the default AI connector from settings will be used.'
        ),
      guidance: z
        .string()
        .optional()
        .describe(
          'Optional guidance to direct the dashboard suggestion (e.g., "Focus on error monitoring")'
        ),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<DashboardSuggestionTaskResult> => {
    const { streamsClient, licensing, uiSettingsClient, taskClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { name },
      body,
    } = params;
    await streamsClient.ensureStream(name);

    const taskId = getDashboardSuggestionTaskId(name);

    const actionParams =
      body.action === 'schedule'
        ? ({
            action: body.action,
            scheduleConfig: {
              taskType: STREAMS_DASHBOARD_SUGGESTION_TASK_TYPE,
              taskId,
              params: await (async (): Promise<DashboardSuggestionTaskParams> => {
                const connectorId = await resolveConnectorId({
                  connectorId: body.connector_id,
                  uiSettingsClient,
                  logger,
                });
                return {
                  connectorId,
                  streamName: name,
                  guidance: body.guidance,
                };
              })(),
              request,
            },
          } as const)
        : ({ action: body.action } as const);

    return handleTaskAction<DashboardSuggestionTaskParams, DashboardSuggestionResult>({
      taskClient,
      taskId,
      ...actionParams,
    });
  },
});

export const internalDashboardSuggestionRoutes = {
  ...dashboardSuggestionStatusRoute,
  ...dashboardSuggestionTaskRoute,
};
