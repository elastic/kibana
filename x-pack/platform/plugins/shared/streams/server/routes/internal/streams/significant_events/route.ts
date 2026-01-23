/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
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
import {
  SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE,
  type SignificantEventsQueriesGenerationTaskParams,
} from '../../../../lib/tasks/task_definitions/significant_events_queries_generation';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { generateSignificantEventsSummary } from '../../../../lib/significant_events/insights/generate_significant_events_summary';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';
import { readSignificantEventsFromAlertsIndices } from '../../../../lib/significant_events/read_significant_events_from_alerts_indices';
import { handleTaskAction } from '../../../utils/task_helpers';
import { resolveConnectorId } from '../../../utils/resolve_connector_id';

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

    return taskClient.getStatus<
      SignificantEventsQueriesGenerationTaskParams,
      SignificantEventsQueriesGenerationResult
    >(getSignificantEventsQueriesGenerationTaskId(name));
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
    const { body } = params;
    const taskId = getSignificantEventsQueriesGenerationTaskId(name);

    const actionParams =
      body.action === 'schedule'
        ? ({
            action: body.action,
            scheduleConfig: {
              taskType: SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE,
              taskId,
              streamName: name,
              params: await (async (): Promise<SignificantEventsQueriesGenerationTaskParams> => {
                const connectorId = await resolveConnectorId({
                  connectorId: body.connectorId,
                  uiSettingsClient,
                  logger,
                });
                return {
                  connectorId,
                  start: body.from.getTime(),
                  end: body.to.getTime(),
                  systems: body.systems,
                  sampleDocsSize: body.sampleDocsSize,
                };
              })(),
              request,
            },
          } as const)
        : ({ action: body.action } as const);

    return handleTaskAction<
      SignificantEventsQueriesGenerationTaskParams,
      SignificantEventsQueriesGenerationResult
    >({
      taskClient,
      taskId,
      ...actionParams,
    });
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
      streamNames: z
        .preprocess(
          (val) => (typeof val === 'string' ? [val] : val),
          z.array(z.string()).optional()
        )
        .describe('Stream names to filter significant events'),
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

    const { from, to, bucketSize, query, streamNames } = params.query;

    return readSignificantEventsFromAlertsIndices(
      {
        from,
        to,
        bucketSize,
        query,
        streamNames,
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
