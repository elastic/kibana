/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InsightsResult } from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import type { TaskResult } from '@kbn/streams-schema/src/tasks/types';
import {
  InsightsOnboardingStep,
  type InsightsOnboardingResult,
} from '@kbn/streams-schema/src/insights';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import type { InsightsDiscoveryTaskParams } from '../../../../lib/tasks/task_definitions/insights_discovery';
import { STREAMS_INSIGHTS_DISCOVERY_TASK_TYPE } from '../../../../lib/tasks/task_definitions/insights_discovery';
import type { InsightsOnboardingTaskParams } from '../../../../lib/tasks/task_definitions/insights_onboarding';
import {
  getInsightsOnboardingTaskId,
  STREAMS_INSIGHTS_ONBOARDING_TASK_TYPE,
} from '../../../../lib/tasks/task_definitions/insights_onboarding';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { resolveConnectorId } from '../../../utils/resolve_connector_id';
import { handleTaskAction } from '../../../utils/task_helpers';

const timestampFromString = z.string().transform((input) => new Date(input).getTime());

/* Insights Onboarding Task */

export type InsightsOnboardingTaskResult = TaskResult<InsightsOnboardingResult>;

const insightsOnboardingTaskRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{streamName}/insights_onboarding/_task',
  options: {
    access: 'internal',
    summary: 'Onboard stream for insights discovery',
    description:
      'Generate description, features and queries for a stream, the data that is necessary for insights discovery.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ streamName: z.string() }),
    body: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('schedule').describe('Schedule a new generation task'),
        from: timestampFromString,
        to: timestampFromString,
        connectorId: z
          .string()
          .optional()
          .describe(
            'Optional connector ID. If not provided, the default AI connector from settings will be used.'
          ),
        steps: z
          .array(z.nativeEnum(InsightsOnboardingStep))
          .optional()
          .default([
            InsightsOnboardingStep.DescriptionGeneration,
            InsightsOnboardingStep.FeaturesIdentification,
            InsightsOnboardingStep.QueriesGeneration,
          ])
          .describe(
            'Optional list of step to perform as part of the stream insights onboarding in the specified sequence. By default it will execute all step.'
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
  }): Promise<InsightsOnboardingTaskResult> => {
    const { licensing, uiSettingsClient, taskClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { streamName },
      body,
    } = params;
    const insightsOnboardingTaskId = getInsightsOnboardingTaskId(streamName);

    const actionParams =
      body.action === 'schedule'
        ? ({
            action: body.action,
            scheduleConfig: {
              taskType: STREAMS_INSIGHTS_ONBOARDING_TASK_TYPE,
              taskId: insightsOnboardingTaskId,
              params: await (async (): Promise<InsightsOnboardingTaskParams> => {
                const connectorId = await resolveConnectorId({
                  connectorId: body.connectorId,
                  uiSettingsClient,
                  logger,
                });

                return {
                  connectorId,
                  streamName,
                  from: body.from,
                  to: body.to,
                  steps: body.steps,
                };
              })(),
              request,
            },
          } as const)
        : ({ action: body.action } as const);

    return handleTaskAction<InsightsOnboardingTaskParams, InsightsOnboardingResult>({
      taskClient,
      taskId: insightsOnboardingTaskId,
      ...actionParams,
    });
  },
});

const insightsOnboardingStatusRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{streamName}/insights_onboarding/_status',
  options: {
    access: 'internal',
    summary: 'Check the status of insights onboarding',
    description: 'Check the status of insights onboarding progress for a stream',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ streamName: z.string() }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<InsightsOnboardingTaskResult> => {
    const { licensing, uiSettingsClient, taskClient } = await getScopedClients({
      request,
    });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { streamName },
    } = params;
    const taskId = getInsightsOnboardingTaskId(streamName);

    return taskClient.getStatus<InsightsOnboardingTaskParams, InsightsOnboardingResult>(taskId);
  },
});

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
  ...insightsOnboardingTaskRoute,
  ...insightsOnboardingStatusRoute,
  ...insightsTaskRoute,
  ...insightsStatusRoute,
};
