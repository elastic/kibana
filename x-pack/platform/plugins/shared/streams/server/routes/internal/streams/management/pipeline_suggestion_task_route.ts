/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { flattenRecord, TaskStatus } from '@kbn/streams-schema';
import type {
  PipelineSuggestionTaskParams,
  PipelineSuggestionTaskPayload,
} from '../../../../lib/tasks/task_definitions/pipeline_suggestion';
import { STREAMS_PIPELINE_SUGGESTION_TASK_TYPE } from '../../../../lib/tasks/task_definitions/pipeline_suggestion';
import type { TaskResult } from '../../../../lib/tasks/types';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import type { PipelineSuggestionBulkStatusItem } from '../../../../../common';
import { createServerRoute } from '../../../create_server_route';
import { handleTaskAction } from '../../../utils/task_helpers';
import { resolveConnectorId } from '../../../utils/resolve_connector_id';

export type PipelineSuggestionTaskResult = TaskResult<PipelineSuggestionTaskPayload>;

/**
 * Helper to generate task ID for pipeline suggestion tasks.
 * Uses stream name to ensure one suggestion per stream.
 */
function getPipelineSuggestionTaskId(streamName: string): string {
  return `${STREAMS_PIPELINE_SUGGESTION_TASK_TYPE}_${streamName}`;
}

/**
 * Zod schema for extracted_patterns parameter (shared with existing route)
 */
const extractedPatternsSchema = z.object({
  grok: z
    .object({
      fieldName: z.string(),
      patternGroups: z.array(
        z.object({
          messages: z.array(z.string()),
          nodes: z.array(
            z.union([
              z.object({ pattern: z.string() }),
              z.object({
                id: z.string(),
                component: z.string(),
                values: z.array(z.string()),
              }),
            ])
          ),
        })
      ),
    })
    .nullable(),
  dissect: z
    .object({
      fieldName: z.string(),
      messages: z.array(z.string()),
    })
    .nullable(),
});

const pipelineSuggestionTaskRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/_pipeline_suggestion/_task',
  options: {
    access: 'internal',
    summary: 'Manage pipeline suggestion task',
    description:
      'Schedule, cancel, or acknowledge pipeline suggestion generation task for a stream',
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
        action: z.literal('schedule').describe('Schedule a new pipeline suggestion task'),
        connectorId: z
          .string()
          .optional()
          .describe(
            'Optional connector ID. If not provided, the default AI connector from settings will be used.'
          ),
        documents: z.array(flattenRecord).describe('Sample documents to use for suggestion'),
        extractedPatterns: extractedPatternsSchema.describe(
          'Grok and dissect patterns extracted client-side'
        ),
      }),
      z.object({
        action: z.literal('cancel').describe('Cancel an in-progress pipeline suggestion task'),
      }),
      z.object({
        action: z
          .literal('acknowledge')
          .describe('Acknowledge a completed pipeline suggestion task'),
      }),
    ]),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    logger,
  }): Promise<PipelineSuggestionTaskResult> => {
    const { uiSettingsClient, taskClient } = await getScopedClients({
      request,
    });

    const { path, body } = params;
    const streamName = path.name;
    const taskId = getPipelineSuggestionTaskId(streamName);

    const actionParams =
      body.action === 'schedule'
        ? ({
            action: body.action,
            scheduleConfig: {
              taskType: STREAMS_PIPELINE_SUGGESTION_TASK_TYPE,
              taskId,
              params: await (async (): Promise<PipelineSuggestionTaskParams> => {
                const connectorId = await resolveConnectorId({
                  connectorId: body.connectorId,
                  uiSettingsClient,
                  logger,
                });

                return {
                  connectorId,
                  streamName,
                  documents: body.documents,
                  extractedPatterns: body.extractedPatterns,
                };
              })(),
              request,
            },
          } as const)
        : ({ action: body.action } as const);

    return handleTaskAction<PipelineSuggestionTaskParams, PipelineSuggestionTaskPayload>({
      taskClient,
      taskId,
      ...actionParams,
    });
  },
});

const pipelineSuggestionStatusRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/_pipeline_suggestion/_status',
  options: {
    access: 'internal',
    summary: 'Get pipeline suggestion task status',
    description: 'Check the status of pipeline suggestion generation for a stream',
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
  handler: async ({ params, request, getScopedClients }): Promise<PipelineSuggestionTaskResult> => {
    const { taskClient } = await getScopedClients({
      request,
    });

    const streamName = params.path.name;
    const taskId = getPipelineSuggestionTaskId(streamName);

    return taskClient.getStatus<PipelineSuggestionTaskParams, PipelineSuggestionTaskPayload>(
      taskId
    );
  },
});

/**
 * Bulk status endpoint for pipeline suggestions.
 * Used by the streams listing page to show suggestion availability for multiple streams.
 * Similar pattern to doc counts endpoint.
 */
const pipelineSuggestionBulkStatusRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_pipeline_suggestion/_bulk_status',
  options: {
    access: 'internal',
    summary: 'Get bulk pipeline suggestion status',
    description:
      'Get pipeline suggestion status for multiple streams. Returns status and whether a suggestion is available.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: z
      .object({
        stream: z.string().optional().describe('Optional stream name to filter to a single stream'),
      })
      .optional(),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
  }): Promise<PipelineSuggestionBulkStatusItem[]> => {
    const { taskClient } = await getScopedClients({
      request,
    });

    const streamName = params?.query?.stream;

    // If a specific stream is requested, only query for that task
    const taskIds = streamName ? [getPipelineSuggestionTaskId(streamName)] : undefined;

    const statusMap = await taskClient.getStatusesByType(
      STREAMS_PIPELINE_SUGGESTION_TASK_TYPE,
      taskIds
    );

    const results: PipelineSuggestionBulkStatusItem[] = [];

    for (const [taskId, status] of statusMap.entries()) {
      // Extract stream name from task ID (format: streams_pipeline_suggestion_{streamName})
      const taskIdPrefix = `${STREAMS_PIPELINE_SUGGESTION_TASK_TYPE}_`;
      const extractedStreamName = taskId.startsWith(taskIdPrefix)
        ? taskId.slice(taskIdPrefix.length)
        : taskId;

      // A suggestion is available if the task completed (or acknowledged) successfully
      const hasSuggestion = status === TaskStatus.Completed || status === TaskStatus.Acknowledged;

      results.push({
        stream: extractedStreamName,
        status,
        hasSuggestion,
      });
    }

    return results;
  },
});

export const pipelineSuggestionTaskRoutes = {
  ...pipelineSuggestionTaskRoute,
  ...pipelineSuggestionStatusRoute,
  ...pipelineSuggestionBulkStatusRoute,
};
