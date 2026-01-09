/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  systemSchema,
  type SignificantEventsGetResponse,
  type SignificantEventsPreviewResponse,
  type SignificantEventsQueriesGenerationTaskResult,
  type SignificantEventsQueriesGenerationResult,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { conditionSchema } from '@kbn/streamlang';
import { BooleanFromString } from '@kbn/zod-helpers';
import { conflict } from '@hapi/boom';
import {
  SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE,
  type SignificantEventsQueriesGenerationTaskParams,
} from '../../../lib/tasks/task_definitions/significant_events_queries_generation';
import { resolveConnectorId } from '../../utils/resolve_connector_id';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { previewSignificantEvents } from '../../../lib/significant_events/preview_significant_events';
import { readSignificantEventsFromAlertsIndices } from '../../../lib/significant_events/read_significant_events_from_alerts_indices';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { AcknowledgingIncompleteError } from '../../../lib/tasks/acknowledging_incomplete_error';
import { CancellationInProgressError } from '../../../lib/tasks/cancellation_in_progress_error';
import { isStale } from '../../../lib/tasks/is_stale';

// Make sure strings are expected for input, but still converted to a
// Date, without breaking the OpenAPI generator
const dateFromString = z.string().transform((input) => new Date(input));

function getSignificantEventsQueriesGenerationTaskId(streamName: string) {
  return `${SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE}_${streamName}`;
}

const previewSignificantEventsRoute = createServerRoute({
  endpoint: 'POST /api/streams/{name}/significant_events/_preview 2023-10-31',
  params: z.object({
    path: z.object({ name: z.string() }),
    query: z.object({ from: dateFromString, to: dateFromString, bucketSize: z.string() }),
    body: z.object({
      query: z.object({
        feature: z
          .object({
            name: z.string(),
            filter: conditionSchema,
            type: z.literal('system'),
          })
          .optional(),
        kql: z.object({
          query: z.string(),
        }),
      }),
    }),
  }),
  options: {
    access: 'public',
    summary: 'Preview significant events',
    description: 'Preview significant event results based on a given query',
    availability: {
      since: '9.1.0',
      stability: 'experimental',
    },
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
  }): Promise<SignificantEventsPreviewResponse> => {
    const { streamsClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      body: { query },
      path: { name },
      query: { bucketSize, from, to },
    } = params;

    const definition = await streamsClient.getStream(name);

    return await previewSignificantEvents(
      {
        definition,
        bucketSize,
        from,
        to,
        query,
      },
      {
        scopedClusterClient,
      }
    );
  },
});

const readSignificantEventsRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/significant_events 2023-10-31',
  params: z.object({
    path: z.object({ name: z.string() }),
    query: z.object({
      from: dateFromString,
      to: dateFromString,
      bucketSize: z.string(),
      query: z
        .string()
        .optional()
        .describe('Query string to filter significant events on metadata fields'),
    }),
  }),

  options: {
    access: 'public',
    summary: 'Read the significant events',
    description: 'Read the significant events',
    availability: {
      since: '9.1.0',
      stability: 'experimental',
    },
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
    const { streamsClient, queryClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });
    await streamsClient.ensureStream(params.path.name);

    const { name } = params.path;
    const { from, to, bucketSize, query } = params.query;

    return await readSignificantEventsFromAlertsIndices(
      {
        name,
        from,
        to,
        bucketSize,
        query,
      },
      { queryClient, scopedClusterClient }
    );
  },
});

const generateSignificantEventsRoute = createServerRoute({
  endpoint: 'POST /api/streams/{name}/significant_events/_generate 2023-10-31',
  params: z.object({
    path: z.object({ name: z.string() }),
    query: z.object({
      connectorId: z
        .string()
        .optional()
        .describe(
          'Optional connector ID. If not provided, the default AI connector from settings will be used.'
        ),
      from: dateFromString,
      to: dateFromString,
      sampleDocsSize: z
        .number()
        .optional()
        .describe(
          'Number of sample documents to use for generation from the current data of stream'
        ),
      schedule: BooleanFromString.optional(),
      cancel: BooleanFromString.optional(),
      acknowledge: BooleanFromString.optional(),
    }),
    body: z.object({
      systems: z.array(systemSchema).optional(),
    }),
  }),
  options: {
    access: 'public',
    summary: 'Generate significant events',
    description: 'Generate significant events queries based on the stream data',
    availability: {
      since: '9.2.0',
      stability: 'experimental',
    },
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
    logger,
  }): Promise<SignificantEventsQueriesGenerationTaskResult> => {
    const { streamsClient, licensing, uiSettingsClient, taskClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });
    await streamsClient.ensureStream(params.path.name);

    const { name } = params.path;

    if (params.query.schedule) {
      try {
        const connectorId = await resolveConnectorId({
          connectorId: params.query.connectorId,
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
            start: params.query.from.getTime(),
            end: params.query.to.getTime(),
            systems: params.body?.systems,
            sampleDocsSize: params.query.sampleDocsSize,
          },
          request,
        });

        return {
          status: 'in_progress',
        };
      } catch (error) {
        if (error instanceof CancellationInProgressError) {
          throw conflict(error.message);
        }

        throw error;
      }
    } else if (params.query.cancel) {
      await taskClient.cancel(getSignificantEventsQueriesGenerationTaskId(name));

      return {
        status: 'being_canceled',
      };
    } else if (params.query.acknowledge) {
      try {
        const task = await taskClient.acknowledge<
          SignificantEventsQueriesGenerationTaskParams,
          SignificantEventsQueriesGenerationResult
        >(getSignificantEventsQueriesGenerationTaskId(name));

        return {
          status: 'acknowledged',
          ...task.task.payload,
        };
      } catch (error) {
        if (error instanceof AcknowledgingIncompleteError) {
          throw conflict(error.message);
        }

        throw error;
      }
    }

    // Check if there's an existing task
    const task = await taskClient.get<
      SignificantEventsQueriesGenerationTaskParams,
      SignificantEventsQueriesGenerationResult
    >(getSignificantEventsQueriesGenerationTaskId(name));

    if (task.status === 'in_progress') {
      if (isStale(task.created_at)) {
        return {
          status: 'stale',
        };
      }

      return {
        status: 'in_progress',
      };
    } else if (task.status === 'failed') {
      return {
        status: 'failed',
        error: task.task.error,
      };
    } else if (task.status === 'completed' || task.status === 'acknowledged') {
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

export const significantEventsRoutes = {
  ...readSignificantEventsRoute,
  ...previewSignificantEventsRoute,
  ...generateSignificantEventsRoute,
};
