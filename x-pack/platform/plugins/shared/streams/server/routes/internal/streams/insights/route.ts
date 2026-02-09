/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InsightsResult } from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import type { TaskResult } from '@kbn/streams-schema';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import type { InsightsDiscoveryTaskParams } from '../../../../lib/tasks/task_definitions/insights_discovery';
import { STREAMS_INSIGHTS_DISCOVERY_TASK_TYPE } from '../../../../lib/tasks/task_definitions/insights_discovery';
import { taskActionSchema } from '../../../../lib/tasks/task_action_schema';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { resolveConnectorId } from '../../../utils/resolve_connector_id';
import { handleTaskAction } from '../../../utils/task_helpers';

/* Insights Discovery Task */

export type InsightsTaskResult = TaskResult<InsightsResult>;

const insightsTaskRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_insights/_task',
  options: {
    access: 'internal',
    summary: 'Management of the insights discovery task',
    description: 'schedules/cancels/acknowledges the insights discovery task',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: taskActionSchema({
      connectorId: z
        .string()
        .optional()
        .describe(
          'Optional connector ID. If not provided, the default AI connector from settings will be used.'
        ),
    }),
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
    summary: 'Check the status of insights discovery',
    description: 'Check the status of insights discovery',
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

export const internalInsightsRoutes = {
  ...insightsTaskRoute,
  ...insightsStatusRoute,
};
