/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { conflict } from '@hapi/boom';
import {
  TaskStatus,
  systemSchema,
  type SignificantEventsQueriesGenerationResult,
  type SignificantEventsQueriesGenerationTaskResult,
  type SignificantEventsGetResponse,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import type { ServerSentEventBase } from '@kbn/sse-utils';
import type { Observable } from 'rxjs';
import { from as toObservableFrom, map } from 'rxjs';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { AcknowledgingIncompleteError } from '../../../../lib/tasks/acknowledging_incomplete_error';
import { CancellationInProgressError } from '../../../../lib/tasks/cancellation_in_progress_error';
import { isStale } from '../../../../lib/tasks/is_stale';
import {
  SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE,
  type SignificantEventsQueriesGenerationTaskParams,
} from '../../../../lib/tasks/task_definitions/significant_events_queries_generation';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { generateSignificantEventsSummary } from '../../../../lib/significant_events/insights/generate_significant_events_summary';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';
import { resolveConnectorId } from '../../../utils/resolve_connector_id';
import { readSignificantEventsFromAlertsIndices } from '../../../../lib/significant_events/read_significant_events_from_alerts_indices';

// Make sure strings are expected for input, but still converted to a
// Date, without breaking the OpenAPI generator
const dateFromString = z.string().transform((input) => new Date(input));

function getSignificantEventsQueriesGenerationTaskId(streamName: string) {
  return `${SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE}_${streamName}`;
}

const significantEventsQueriesGenerationStatusRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/significant_events/_status',
  params: z.object({
    path: z.object({ name: z.string().describe('The name of the stream') }),
  }),
  options: {
    access: 'internal',
    summary: 'Check the status of significant events query generation',
    description:
      'Significant events query generation happens as a background task, this endpoint allows the user to check the status of this task.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<SignificantEventsQueriesGenerationTaskResult> => {
    const { streamsClient, licensing, uiSettingsClient, taskClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });
    await streamsClient.ensureStream(params.path.name);

    const { name } = params.path;

    const task = await taskClient.get<
      SignificantEventsQueriesGenerationTaskParams,
      SignificantEventsQueriesGenerationResult
    >(getSignificantEventsQueriesGenerationTaskId(name));

    if (task.status === TaskStatus.InProgress) {
      return isStale(task.created_at) ? { status: TaskStatus.Stale } : { status: task.status };
    } else if (task.status === TaskStatus.Failed) {
      return {
        status: task.status,
        error: task.task.error,
      };
    } else if (task.status === TaskStatus.Completed || task.status === TaskStatus.Acknowledged) {
      return {
        status: task.status,
        ...task.task.payload,
      };
    }

    // Return status for remaining states: not_started, canceled, being_canceled
    return {
      status: task.status,
    };
  },
});

const significantEventsQueriesGenerationTaskRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/significant_events/_task',
  params: z.object({
    path: z.object({ name: z.string().describe('The name of the stream') }),
    body: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('schedule').describe('Schedule a new generation task'),
        from: dateFromString.describe('Start of the time range'),
        to: dateFromString.describe('End of the time range'),
        connectorId: z
          .string()
          .optional()
          .describe(
            'Optional connector ID. If not provided, the default AI connector from settings will be used.'
          ),
        sampleDocsSize: z
          .number()
          .optional()
          .describe(
            'Number of sample documents to use for generation from the current data of stream'
          ),
        systems: z.array(systemSchema).optional().describe('Optional array of systems'),
      }),
      z.object({
        action: z.literal('cancel').describe('Cancel an in-progress generation task'),
      }),
      z.object({
        action: z.literal('acknowledge').describe('Acknowledge a completed generation task'),
      }),
    ]),
  }),
  options: {
    access: 'internal',
    summary: 'Manage significant events query generation task',
    description:
      'Manage the lifecycle of the background task that generates significant events queries based on the stream data.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<SignificantEventsQueriesGenerationTaskResult> => {
    const { streamsClient, licensing, uiSettingsClient, taskClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });
    await streamsClient.ensureStream(params.path.name);

    const { name } = params.path;
    const { action } = params.body;

    if (action === 'schedule') {
      const {
        from: start,
        to: end,
        connectorId: connectorIdParam,
        sampleDocsSize,
        systems,
      } = params.body;

      try {
        const connectorId = await resolveConnectorId({
          connectorId: connectorIdParam,
          uiSettingsClient,
          logger,
        });
        await taskClient.schedule<SignificantEventsQueriesGenerationTaskParams>({
          task: {
            type: SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE,
            id: getSignificantEventsQueriesGenerationTaskId(name),
            space: '*',
            stream: name,
          },
          params: {
            connectorId,
            start: start.getTime(),
            end: end.getTime(),
            systems,
            sampleDocsSize,
          },
          request,
        });

        return {
          status: TaskStatus.InProgress,
        };
      } catch (error) {
        if (error instanceof CancellationInProgressError) {
          throw conflict(error.message);
        }

        throw error;
      }
    } else if (action === 'cancel') {
      await taskClient.cancel(getSignificantEventsQueriesGenerationTaskId(name));

      return {
        status: TaskStatus.BeingCanceled,
      };
    }

    // action === 'acknowledge'
    try {
      const task = await taskClient.acknowledge<
        SignificantEventsQueriesGenerationTaskParams,
        SignificantEventsQueriesGenerationResult
      >(getSignificantEventsQueriesGenerationTaskId(name));

      return {
        status: TaskStatus.Acknowledged,
        ...task.task.payload,
      };
    } catch (error) {
      if (error instanceof AcknowledgingIncompleteError) {
        throw conflict(error.message);
      }

      throw error;
    }
  },
});

const readAllSignificantEventsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_significant_events',
  params: z.object({
    query: z.object({
      from: dateFromString.describe('Start of the time range'),
      to: dateFromString.describe('End of the time range'),
      bucketSize: z.string().describe('Size of time buckets for aggregation'),
      query: z.string().optional().describe('Query string to filter significant events queries'),
    }),
  }),
  options: {
    access: 'internal',
    summary: 'Read all significant events',
    description: 'Read all significant events',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<SignificantEventsGetResponse> => {
    const { queryClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { from, to, bucketSize, query } = params.query;

    return readSignificantEventsFromAlertsIndices(
      {
        from,
        to,
        bucketSize,
        query,
      },
      { queryClient, scopedClusterClient }
    );
  },
});

type SignificantEventsSummaryEvent = ServerSentEventBase<
  'significant_events_summary',
  { summary: string; tokenUsage: { prompt: number; completion: number } }
>;

const generateSummaryRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_significant_events/_generate_summary',
  options: {
    access: 'internal',
    summary: 'Generate a summary of detected significant events',
    description: 'Generate a summary of detected significant events',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: z.object({
      connectorId: z.string(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<Observable<SignificantEventsSummaryEvent>> => {
    const {
      licensing,
      uiSettingsClient,
      inferenceClient,
      streamsClient,
      queryClient,
      scopedClusterClient,
    } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return toObservableFrom(
      generateSignificantEventsSummary({
        streamsClient,
        queryClient,
        esClient: scopedClusterClient.asCurrentUser,
        inferenceClient: inferenceClient.bindTo({ connectorId: params.query.connectorId }),
        signal: getRequestAbortSignal(request),
        logger,
      })
    ).pipe(
      map((result) => {
        return {
          type: 'significant_events_summary',
          ...result,
        };
      })
    );
  },
});

export const internalSignificantEventsRoutes = {
  ...significantEventsQueriesGenerationStatusRoute,
  ...significantEventsQueriesGenerationTaskRoute,
  ...readAllSignificantEventsRoute,
  ...generateSummaryRoute,
};
