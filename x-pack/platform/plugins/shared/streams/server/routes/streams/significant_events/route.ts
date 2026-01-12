/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { conflict } from '@hapi/boom';
import { conditionSchema } from '@kbn/streamlang';
import {
  TaskStatus,
  systemSchema,
  type SignificantEventsGenerateResponse,
  type SignificantEventsGetResponse,
  type SignificantEventsPreviewResponse,
  type SignificantEventsQueriesGenerationResult,
  type SignificantEventsQueriesGenerationTaskResult,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { catchError, from as fromRxjs, map } from 'rxjs';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { PromptsConfigService } from '../../../lib/saved_objects/significant_events/prompts_config_service';
import { generateSignificantEventDefinitions } from '../../../lib/significant_events/generate_significant_events';
import { previewSignificantEvents } from '../../../lib/significant_events/preview_significant_events';
import { readSignificantEventsFromAlertsIndices } from '../../../lib/significant_events/read_significant_events_from_alerts_indices';
import { AcknowledgingIncompleteError } from '../../../lib/tasks/acknowledging_incomplete_error';
import { CancellationInProgressError } from '../../../lib/tasks/cancellation_in_progress_error';
import { isStale } from '../../../lib/tasks/is_stale';
import {
  SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE,
  type SignificantEventsQueriesGenerationTaskParams,
} from '../../../lib/tasks/task_definitions/significant_events_queries_generation';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { createConnectorSSEError } from '../../utils/create_connector_sse_error';
import { getRequestAbortSignal } from '../../utils/get_request_abort_signal';
import { resolveConnectorId } from '../../utils/resolve_connector_id';

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
    }),
    body: z.object({
      system: systemSchema.optional(),
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
  }): Promise<SignificantEventsGenerateResponse> => {
    const {
      streamsClient,
      scopedClusterClient,
      licensing,
      inferenceClient,
      uiSettingsClient,
      soClient,
    } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });
    await streamsClient.ensureStream(params.path.name);

    const connectorId = await resolveConnectorId({
      connectorId: params.query.connectorId,
      uiSettingsClient,
      logger,
    });

    const promptsConfigService = new PromptsConfigService({
      soClient,
      logger,
    });

    // Get connector info for error enrichment
    const connector = await inferenceClient.getConnectorById(connectorId);

    const definition = await streamsClient.getStream(params.path.name);

    const { significantEventsPromptOverride } = await promptsConfigService.getPrompt();

    return fromRxjs(
      generateSignificantEventDefinitions(
        {
          definition,
          system: params.body?.system,
          connectorId,
          start: params.query.from.valueOf(),
          end: params.query.to.valueOf(),
          sampleDocsSize: params.query.sampleDocsSize,
          systemPromptOverride: significantEventsPromptOverride,
        },
        {
          inferenceClient,
          esClient: scopedClusterClient.asCurrentUser,
          logger: logger.get('significant_events'),
          signal: getRequestAbortSignal(request),
        }
      )
    ).pipe(
      map(({ queries, tokensUsed }) => ({
        type: 'generated_queries' as const,
        queries,
        tokensUsed,
      })),
      catchError((error: Error) => {
        throw createConnectorSSEError(error, connector);
      })
    );
  },
});

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
        status: TaskStatus.Failed,
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

export const significantEventsRoutes = {
  ...readSignificantEventsRoute,
  ...previewSignificantEventsRoute,
  ...generateSignificantEventsRoute,
  ...significantEventsQueriesGenerationStatusRoute,
  ...significantEventsQueriesGenerationTaskRoute,
};
