/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { BooleanFromString } from '@kbn/zod-helpers';
import type { OnboardingResult, TaskResult } from '@kbn/streams-schema';
import { OnboardingStep } from '@kbn/streams-schema';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import type { OnboardingTaskParams } from '../../../../lib/tasks/task_definitions/onboarding';
import {
  getOnboardingTaskId,
  STREAMS_ONBOARDING_TASK_TYPE,
} from '../../../../lib/tasks/task_definitions/onboarding';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { resolveConnectorId } from '../../../utils/resolve_connector_id';
import { handleTaskAction } from '../../../utils/task_helpers';
import { taskActionSchema } from '../../../../lib/tasks/task_action_schema';

const timestampFromString = z.string().transform((input) => new Date(input).getTime());
const saveQueriesSchema = BooleanFromString.optional().default(true);

export type OnboardingTaskResult = TaskResult<OnboardingResult>;

export const onboardingTaskRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{streamName}/onboarding/_task',
  options: {
    access: 'internal',
    summary: 'Onboard stream',
    description:
      'Generate features and queries for a stream, the data that is necessary for insights discovery.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ streamName: z.string() }),
    query: z.object({
      saveQueries: saveQueriesSchema,
    }),
    body: taskActionSchema({
      from: timestampFromString,
      to: timestampFromString,
      connectorId: z
        .string()
        .optional()
        .describe(
          'Optional connector ID. If not provided, the default AI connector from settings will be used.'
        ),
      steps: z
        .array(z.nativeEnum(OnboardingStep))
        .optional()
        .default([OnboardingStep.FeaturesIdentification, OnboardingStep.QueriesGeneration])
        .describe(
          'Optional list of steps to perform as part of stream onboarding in the specified sequence. By default it will execute all steps.'
        ),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<OnboardingTaskResult> => {
    const { licensing, uiSettingsClient, taskClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { streamName },
      query,
      body,
    } = params;

    const { saveQueries } = query;

    const onboardingTaskId = getOnboardingTaskId(streamName, saveQueries);

    const actionParams =
      body.action === 'schedule'
        ? ({
            action: body.action,
            scheduleConfig: {
              taskType: STREAMS_ONBOARDING_TASK_TYPE,
              taskId: onboardingTaskId,
              params: await (async (): Promise<OnboardingTaskParams> => {
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
                  saveQueries,
                };
              })(),
              request,
            },
          } as const)
        : ({ action: body.action } as const);

    return handleTaskAction<OnboardingTaskParams, OnboardingResult>({
      taskClient,
      taskId: onboardingTaskId,
      ...actionParams,
    });
  },
});

export const onboardingStatusRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{streamName}/onboarding/_status',
  options: {
    access: 'internal',
    summary: 'Check the status of stream onboarding',
    description: 'Check the status of onboarding progress for a stream',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ streamName: z.string() }),
    query: z.object({
      saveQueries: saveQueriesSchema,
    }),
  }),
  handler: async ({ params, request, getScopedClients, server }): Promise<OnboardingTaskResult> => {
    const { licensing, uiSettingsClient, taskClient } = await getScopedClients({
      request,
    });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { streamName },
      query: { saveQueries },
    } = params;
    const taskId = getOnboardingTaskId(streamName, saveQueries);

    return taskClient.getStatus<OnboardingTaskParams, OnboardingResult>(taskId);
  },
});

export const internalOnboardingRoutes = {
  ...onboardingTaskRoute,
  ...onboardingStatusRoute,
};
