/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { TaskResult } from '@kbn/streams-schema';
import type {
  PartitionSuggestionTaskParams,
  PartitionSuggestionTaskPayload,
} from '../../../../lib/tasks/task_definitions/partition_suggestion';
import {
  STREAMS_PARTITION_SUGGESTION_TASK_TYPE,
  getPartitionSuggestionTaskId,
} from '../../../../lib/tasks/task_definitions/partition_suggestion';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { handleTaskAction } from '../../../utils/task_helpers';
import { resolveConnectorId } from '../../../utils/resolve_connector_id';

export type PartitionSuggestionTaskResult = TaskResult<PartitionSuggestionTaskPayload>;

const partitionSuggestionTaskRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/_partition_suggestion/_task',
  options: {
    access: 'internal',
    summary: 'Manage partition suggestion task',
    description:
      'Schedule, cancel, or acknowledge partition suggestion generation task for a stream',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    body: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('schedule').describe('Schedule a new partition suggestion task'),
        connectorId: z
          .string()
          .optional()
          .describe(
            'Optional connector ID. If not provided, the default AI connector from settings will be used.'
          ),
        start: z.number().describe('Start timestamp for sampling documents'),
        end: z.number().describe('End timestamp for sampling documents'),
      }),
      z.object({
        action: z.literal('cancel').describe('Cancel an in-progress partition suggestion task'),
      }),
      z.object({
        action: z
          .literal('acknowledge')
          .describe('Acknowledge a completed partition suggestion task'),
      }),
    ]),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    logger,
  }): Promise<PartitionSuggestionTaskResult> => {
    const { uiSettingsClient, taskClient } = await getScopedClients({
      request,
    });

    const { path, body } = params;
    const streamName = path.name;
    const taskId = getPartitionSuggestionTaskId(streamName);

    const actionParams =
      body.action === 'schedule'
        ? ({
            action: body.action,
            scheduleConfig: {
              taskType: STREAMS_PARTITION_SUGGESTION_TASK_TYPE,
              taskId,
              params: await (async (): Promise<PartitionSuggestionTaskParams> => {
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

    return handleTaskAction<PartitionSuggestionTaskParams, PartitionSuggestionTaskPayload>({
      taskClient,
      taskId,
      ...actionParams,
    });
  },
});

const partitionSuggestionStatusRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/_partition_suggestion/_status',
  options: {
    access: 'internal',
    summary: 'Get partition suggestion task status',
    description: 'Check the status of partition suggestion generation for a stream',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
  }): Promise<PartitionSuggestionTaskResult> => {
    const { taskClient } = await getScopedClients({
      request,
    });

    const streamName = params.path.name;
    const taskId = getPartitionSuggestionTaskId(streamName);

    return taskClient.getStatus<PartitionSuggestionTaskParams, PartitionSuggestionTaskPayload>(
      taskId
    );
  },
});

export const partitionSuggestionTaskRoutes = {
  ...partitionSuggestionTaskRoute,
  ...partitionSuggestionStatusRoute,
};
