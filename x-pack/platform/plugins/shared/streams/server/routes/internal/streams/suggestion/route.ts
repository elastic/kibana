/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { TaskResult } from '@kbn/streams-schema';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import type {
  StreamsSuggestionTaskParams,
  StreamsSuggestionTaskPayload,
} from '../../../../lib/tasks/task_definitions/streams_suggestion';
import {
  STREAMS_SUGGESTION_TASK_TYPE,
  getStreamsSuggestionTaskId,
} from '../../../../lib/tasks/task_definitions/streams_suggestion';
import { taskActionSchema } from '../../../../lib/tasks/task_action_schema';
import { createServerRoute } from '../../../create_server_route';
import { resolveConnectorId } from '../../../utils/resolve_connector_id';
import { handleTaskAction } from '../../../utils/task_helpers';

/* Streams Suggestion Task */

export type StreamsSuggestionTaskResult = TaskResult<StreamsSuggestionTaskPayload>;

const suggestionTaskRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/_suggestion/_task',
  options: {
    access: 'internal',
    summary: 'Manage the streams suggestion task for a specific stream',
    description:
      'Schedules/cancels/acknowledges the streams suggestion task which generates partition suggestions, creates draft child streams with suggestion flag, and invokes mapping/dashboard engines.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string().describe('The name of the root stream to generate suggestions for'),
    }),
    body: taskActionSchema({
      connectorId: z
        .string()
        .optional()
        .describe(
          'Optional connector ID. If not provided, the default AI connector from settings will be used.'
        ),
      start: z.number().describe('Start timestamp in milliseconds'),
      end: z.number().describe('End timestamp in milliseconds'),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    logger,
  }): Promise<StreamsSuggestionTaskResult> => {
    const { uiSettingsClient, taskClient, streamsClient } = await getScopedClients({
      request,
    });

    const {
      path: { name: streamName },
      body,
    } = params;

    // Verify stream exists
    await streamsClient.ensureStream(streamName);

    const taskId = getStreamsSuggestionTaskId(streamName);

    const actionParams =
      body.action === 'schedule'
        ? ({
            action: body.action,
            scheduleConfig: {
              taskType: STREAMS_SUGGESTION_TASK_TYPE,
              taskId,
              params: await (async (): Promise<StreamsSuggestionTaskParams> => {
                const connectorId = await resolveConnectorId({
                  connectorId: body.connectorId,
                  uiSettingsClient,
                  logger,
                });

                return {
                  connectorId,
                  streamName,
                  start: body.start,
                  end: body.end,
                };
              })(),
              request,
            },
          } as const)
        : ({ action: body.action } as const);

    return handleTaskAction<StreamsSuggestionTaskParams, StreamsSuggestionTaskPayload>({
      taskClient,
      taskId,
      ...actionParams,
    });
  },
});

const suggestionStatusRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/_suggestion/_status',
  options: {
    access: 'internal',
    summary: 'Check the status of streams suggestion task for a specific stream',
    description:
      'Returns the current status of the streams suggestion task including per-stream orchestration results.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string().describe('The name of the root stream'),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<StreamsSuggestionTaskResult> => {
    const { taskClient, streamsClient } = await getScopedClients({
      request,
    });

    const {
      path: { name: streamName },
    } = params;

    // Verify stream exists
    await streamsClient.ensureStream(streamName);

    return taskClient.getStatus<StreamsSuggestionTaskParams, StreamsSuggestionTaskPayload>(
      getStreamsSuggestionTaskId(streamName)
    );
  },
});

export const internalSuggestionRoutes = {
  ...suggestionTaskRoute,
  ...suggestionStatusRoute,
};
