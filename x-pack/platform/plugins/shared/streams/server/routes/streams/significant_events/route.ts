/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { conditionSchema } from '@kbn/streamlang';
import {
  systemSchema,
  type SignificantEventsGenerateResponse,
  type SignificantEventsGetResponse,
  type SignificantEventsPreviewResponse,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { catchError, from as fromRxjs, map } from 'rxjs';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { PromptsConfigService } from '../../../lib/saved_objects/significant_events/prompts_config_service';
import { generateSignificantEventDefinitions } from '../../../lib/significant_events/generate_significant_events';
import { previewSignificantEvents } from '../../../lib/significant_events/preview_significant_events';
import { readSignificantEventsFromAlertsIndices } from '../../../lib/significant_events/read_significant_events_from_alerts_indices';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { createConnectorSSEError } from '../../utils/create_connector_sse_error';
import { getRequestAbortSignal } from '../../utils/get_request_abort_signal';
import { resolveConnectorId } from '../../utils/resolve_connector_id';

// Make sure strings are expected for input, but still converted to a
// Date, without breaking the OpenAPI generator
const dateFromString = z.string().transform((input) => new Date(input));

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

const readStreamSignificantEventsRoute = createServerRoute({
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

    return readSignificantEventsFromAlertsIndices(
      {
        streamNames: [name],
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

    // Get connector info for error enrichment
    const [connector, definition, { significantEventsPromptOverride }] = await Promise.all([
      inferenceClient.getConnectorById(connectorId),
      streamsClient.getStream(params.path.name),
      new PromptsConfigService({ soClient, logger }).getPrompt(),
    ]);

    return fromRxjs(
      generateSignificantEventDefinitions(
        {
          definition,
          system: params.body?.system,
          connectorId,
          start: params.query.from.valueOf(),
          end: params.query.to.valueOf(),
          sampleDocsSize: params.query.sampleDocsSize,
          systemPrompt: significantEventsPromptOverride,
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

export const significantEventsRoutes = {
  ...readStreamSignificantEventsRoute,
  ...previewSignificantEventsRoute,
  ...generateSignificantEventsRoute,
};
