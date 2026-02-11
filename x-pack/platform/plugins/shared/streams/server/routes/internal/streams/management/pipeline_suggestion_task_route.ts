/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { flattenRecord, TaskStatus } from '@kbn/streams-schema';
import type { TaskResult } from '@kbn/streams-schema';
import type {
  PipelineSuggestionTaskParams,
  PipelineSuggestionTaskPayload,
} from '../../../../lib/tasks/task_definitions/pipeline_suggestion';
import { STREAMS_PIPELINE_SUGGESTION_TASK_TYPE } from '../../../../lib/tasks/task_definitions/pipeline_suggestion';
import {
  FEATURES_IDENTIFICATION_TASK_TYPE,
  getFeaturesIdentificationTaskId,
} from '../../../../lib/tasks/task_definitions/features_identification';
import { SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE } from '../../../../lib/tasks/task_definitions/significant_events_queries_generation';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import type { SuggestionBulkStatusItem } from '../../../../../common';
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
 * Helper to generate task ID for significant events queries generation tasks.
 */
function getSignificantEventsQueriesGenerationTaskId(streamName: string): string {
  return `${SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE}_${streamName}`;
}

/**
 * Helper to extract stream name from a task ID.
 * Task IDs are formatted as {taskType}_{streamName}
 */
function extractStreamNameFromTaskId(taskId: string, taskType: string): string {
  const prefix = `${taskType}_`;
  return taskId.startsWith(prefix) ? taskId.slice(prefix.length) : taskId;
}

/**
 * All suggestion task types that should be counted in the bulk status endpoint.
 */
const SUGGESTION_TASK_TYPES = [
  STREAMS_PIPELINE_SUGGESTION_TASK_TYPE,
  FEATURES_IDENTIFICATION_TASK_TYPE,
  SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE,
] as const;

/**
 * Bulk status endpoint for suggestions.
 * Used by the streams listing page to show suggestion counts for multiple streams.
 * Includes pipeline suggestions, feature identification, and significant events queries.
 */
const pipelineSuggestionBulkStatusRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_pipeline_suggestion/_bulk_status',
  options: {
    access: 'internal',
    summary: 'Get bulk suggestion status',
    description:
      'Get suggestion status for multiple streams. Returns counts of available suggestions across all suggestion types (pipeline, features, significant events).',
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
  handler: async ({ params, request, getScopedClients }): Promise<SuggestionBulkStatusItem[]> => {
    const { taskClient } = await getScopedClients({
      request,
    });

    const streamName = params?.query?.stream;

    // Build a map of stream name -> per-type suggestion counts
    interface StreamCounts {
      pipelineCount: number;
      featuresCount: number;
      significantEventsCount: number;
    }
    const streamSuggestionCounts = new Map<string, StreamCounts>();

    const getOrCreateCounts = (stream: string): StreamCounts => {
      let counts = streamSuggestionCounts.get(stream);
      if (!counts) {
        counts = { pipelineCount: 0, featuresCount: 0, significantEventsCount: 0 };
        streamSuggestionCounts.set(stream, counts);
      }
      return counts;
    };

    // Query all suggestion task types and aggregate counts
    for (const taskType of SUGGESTION_TASK_TYPES) {
      // If a specific stream is requested, only query for that task
      let taskIds: string[] | undefined;
      if (streamName) {
        if (taskType === STREAMS_PIPELINE_SUGGESTION_TASK_TYPE) {
          taskIds = [getPipelineSuggestionTaskId(streamName)];
        } else if (taskType === FEATURES_IDENTIFICATION_TASK_TYPE) {
          taskIds = [getFeaturesIdentificationTaskId(streamName)];
        } else if (taskType === SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE) {
          taskIds = [getSignificantEventsQueriesGenerationTaskId(streamName)];
        }
      }

      const statusMap = await taskClient.getStatusesByType(taskType, taskIds);

      for (const [taskId, status] of statusMap.entries()) {
        const extractedStreamName = extractStreamNameFromTaskId(taskId, taskType);

        // A suggestion counts as available only if the task completed but not yet acknowledged
        // Acknowledged tasks have already been accepted/rejected/dismissed by the user
        const hasSuggestion = status === TaskStatus.Completed;

        const counts = getOrCreateCounts(extractedStreamName);
        if (hasSuggestion) {
          if (taskType === STREAMS_PIPELINE_SUGGESTION_TASK_TYPE) {
            counts.pipelineCount += 1;
          } else if (taskType === FEATURES_IDENTIFICATION_TASK_TYPE) {
            counts.featuresCount += 1;
          } else if (taskType === SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE) {
            counts.significantEventsCount += 1;
          }
        }
      }
    }

    // Convert map to array of results
    const results: SuggestionBulkStatusItem[] = [];
    for (const [stream, counts] of streamSuggestionCounts.entries()) {
      const suggestionCount =
        counts.pipelineCount + counts.featuresCount + counts.significantEventsCount;
      results.push({
        stream,
        suggestionCount,
        pipelineCount: counts.pipelineCount,
        featuresCount: counts.featuresCount,
        significantEventsCount: counts.significantEventsCount,
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
