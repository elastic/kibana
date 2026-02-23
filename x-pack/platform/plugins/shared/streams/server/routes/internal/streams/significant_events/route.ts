/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SignificantEventsGetResponse } from '@kbn/streams-schema';
import {
  buildEsqlQuery,
  getIndexPatternsForStream,
  systemSchema,
  type Streams,
  type SignificantEventsQueriesGenerationResult,
  type SignificantEventsQueriesGenerationTaskResult,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { readSignificantEventsFromAlertsIndices } from '../../../../lib/significant_events/read_significant_events_from_alerts_indices';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import {
  getSignificantEventsQueriesGenerationTaskId,
  SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE,
  type SignificantEventsQueriesGenerationTaskParams,
} from '../../../../lib/tasks/task_definitions/significant_events_queries_generation';
import { taskActionSchema } from '../../../../lib/tasks/task_action_schema';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { handleTaskAction } from '../../../utils/task_helpers';
import { resolveConnectorId } from '../../../utils/resolve_connector_id';

// Make sure strings are expected for input, but still converted to a
// Date, without breaking the OpenAPI generator
const dateFromString = z.string().transform((input) => new Date(input));

/**
 * Back-fills `esql.query` on task results for legacy tasks that were completed
 * before the `esql.query` property was introduced. Without this, the client
 * would receive queries without the required `esql.query` field.
 */
const ensureEsqlQuery = (
  result: SignificantEventsQueriesGenerationTaskResult,
  definition: Streams.all.Definition
): SignificantEventsQueriesGenerationTaskResult => {
  if (!('queries' in result)) {
    return result;
  }

  const indices = getIndexPatternsForStream(definition);
  return {
    ...result,
    queries: result.queries.map((query) => ({
      ...query,
      esql: query.esql ?? {
        query: buildEsqlQuery(indices, {
          kql: { query: query.kql },
          feature: query.feature,
        }),
      },
    })),
  };
};

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

    const { name } = params.path;
    const definition = await streamsClient.getStream(name);

    const result = await taskClient.getStatus<
      SignificantEventsQueriesGenerationTaskParams,
      SignificantEventsQueriesGenerationResult
    >(getSignificantEventsQueriesGenerationTaskId(name));

    return ensureEsqlQuery(result, definition);
  },
});

const significantEventsQueriesGenerationTaskRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/significant_events/_task',
  params: z.object({
    path: z.object({ name: z.string().describe('The name of the stream') }),
    body: taskActionSchema({
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

    const { name } = params.path;
    const definition = await streamsClient.getStream(name);
    const { body } = params;
    const taskId = getSignificantEventsQueriesGenerationTaskId(name);

    const actionParams =
      body.action === 'schedule'
        ? ({
            action: body.action,
            scheduleConfig: {
              taskType: SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE,
              taskId,
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
                  streamName: name,
                };
              })(),
              request,
            },
          } as const)
        : ({ action: body.action } as const);

    const result = await handleTaskAction<
      SignificantEventsQueriesGenerationTaskParams,
      SignificantEventsQueriesGenerationResult
    >({
      taskClient,
      taskId,
      ...actionParams,
    });

    return ensureEsqlQuery(result, definition);
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

export const internalSignificantEventsRoutes = {
  ...significantEventsQueriesGenerationStatusRoute,
  ...significantEventsQueriesGenerationTaskRoute,
  ...readAllSignificantEventsRoute,
};
