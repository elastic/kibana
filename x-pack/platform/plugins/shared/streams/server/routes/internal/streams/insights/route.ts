/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { InsightsResult } from '@kbn/streams-schema';
import type { InsightsIdentificationTaskParams } from '../../../../lib/tasks/task_definitions/insights_identification';
import {
  getStreamsInsightsIdentificationTaskId,
  STREAMS_INSIGHTS_IDENTIFICATION_TASK_TYPE,
} from '../../../../lib/tasks/task_definitions/insights_identification';
import type { TaskResult } from '../../../../lib/tasks/types';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { handleTaskAction } from '../../../utils/task_helpers';
import { resolveConnectorId } from '../../../utils/resolve_connector_id';

const dateFromString = z.string().transform((input) => new Date(input));

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
        from: dateFromString.describe('Start of the time range'),
        to: dateFromString.describe('End of the time range'),
        streamNames: z.array(z.string()).describe('Names of the streams to identify insights in'),
        connectorId: z
          .string()
          .optional()
          .describe(
            'Optional connector ID. If not provided, the default AI connector from settings will be used.'
          ),
      }),
      z.object({
        action: z.literal('cancel').describe('Cancel an in-progress generation task'),
        streamNames: z.array(z.string()).describe('Names of the streams to identify insights in'),
      }),
      z.object({
        action: z.literal('acknowledge').describe('Acknowledge a completed generation task'),
        streamNames: z.array(z.string()).describe('Names of the streams to identify insights in'),
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

    const taskId = getStreamsInsightsIdentificationTaskId(body.streamNames);

    const actionParams =
      body.action === 'schedule'
        ? ({
            action: body.action,
            scheduleConfig: {
              taskType: STREAMS_INSIGHTS_IDENTIFICATION_TASK_TYPE,
              taskId,
              params: await (async (): Promise<InsightsIdentificationTaskParams> => {
                const connectorId = await resolveConnectorId({
                  connectorId: body.connectorId,
                  uiSettingsClient,
                  logger,
                });

                return {
                  connectorId,
                  start: body.from.getTime(),
                  end: body.to.getTime(),
                  streamNames: body.streamNames,
                };
              })(),
              request,
            },
          } as const)
        : ({ action: body.action } as const);

    return handleTaskAction<InsightsIdentificationTaskParams, InsightsResult>({
      taskClient,
      taskId,
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
  params: z.object({
    body: z.object({
      streamNames: z.array(z.string()).describe('Names of the streams to check the status of'),
    }),
  }),
  handler: async ({ params, request, getScopedClients, server }): Promise<InsightsTaskResult> => {
    const { licensing, uiSettingsClient, taskClient } = await getScopedClients({
      request,
    });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { body } = params;

    return taskClient.getStatus<InsightsIdentificationTaskParams, InsightsResult>(
      getStreamsInsightsIdentificationTaskId(body.streamNames)
    );
  },
});

export const internalInsightsRoutes = {
  ...insightsTaskRoute,
  ...insightsStatusRoute,
};
