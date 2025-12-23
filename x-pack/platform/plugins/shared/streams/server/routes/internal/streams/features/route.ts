/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { featureSchema, featureStatusSchema, type Feature } from '@kbn/streams-schema';
import type { StorageClientBulkResponse, StorageClientIndexResponse } from '@kbn/storage-adapter';
import { generateStreamDescription, sumTokens } from '@kbn/streams-ai';
import type { Observable } from 'rxjs';
import { from, map, catchError } from 'rxjs';
import { PromptsConfigService } from '../../../../lib/saved_objects/significant_events/prompts_config_service';
import { createConnectorSSEError } from '../../../utils/create_connector_sse_error';
import { createServerRoute } from '../../../create_server_route';
import { checkAccess } from '../../../../lib/streams/stream_crud';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import type { IdentifiedFeaturesEvent, StreamDescriptionEvent } from './types';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';
import { getDefaultFeatureRegistry } from '../../../../lib/streams/feature/feature_type_registry';

const dateFromString = z.string().transform((input) => new Date(input));

export const upsertFeatureRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/features',
  options: {
    access: 'internal',
    summary: 'Upserts a feature for a stream',
    description: 'Upserts the specified feature',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
    body: featureSchema,
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<StorageClientIndexResponse> => {
    const { featureClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { name },
      body,
    } = params;

    const { read } = await checkAccess({ name, scopedClusterClient });
    if (!read) {
      throw new SecurityError(`Cannot update features for stream ${name}, insufficient privileges`);
    }

    return await featureClient.updateFeature(name, body);
  },
});

export const listFeaturesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/features',
  options: {
    access: 'internal',
    summary: 'Lists all features for a stream',
    description: 'Fetches all features for the specified stream',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
    query: z.optional(z.object({ status: featureStatusSchema.optional() })),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ features: Feature[] }> => {
    const { featureClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { name } = params.path;
    const { read } = await checkAccess({ name, scopedClusterClient });
    if (!read) {
      throw new SecurityError(`Cannot read stream ${name}, insufficient privileges`);
    }

    const { hits: features } = await featureClient.getFeatures(name, params.query?.status);
    return {
      features,
    };
  },
});

export const bulkFeaturesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/features/_bulk',
  options: {
    access: 'internal',
    summary: 'Bulk changes to features',
    description: 'Add or delete features in bulk for a given stream',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
    body: z.object({
      operations: z.array(
        z.union([
          z.object({
            index: z.object({
              feature: featureSchema,
            }),
          }),
          z.object({
            delete: z.object({
              id: z.string(),
            }),
          }),
        ])
      ),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<StorageClientBulkResponse> => {
    const { featureClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { name },
      body: { operations },
    } = params;
    const { read } = await checkAccess({ name, scopedClusterClient });
    if (!read) {
      throw new SecurityError(`Cannot update features for stream ${name}, insufficient privileges`);
    }

    return await featureClient.bulk(name, operations);
  },
});

export const identifyFeaturesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/features/_identify',
  options: {
    access: 'internal',
    summary: 'Identify features in a stream',
    description: 'Identify features in a stream with an LLM',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
    query: z.object({
      connectorId: z.string(),
      from: dateFromString,
      to: dateFromString,
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<Observable<IdentifiedFeaturesEvent>> => {
    const {
      featureClient,
      scopedClusterClient,
      licensing,
      uiSettingsClient,
      streamsClient,
      inferenceClient,
    } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { name },
      query: { connectorId, from: start, to: end },
    } = params;

    const { read } = await checkAccess({ name, scopedClusterClient });
    if (!read) {
      throw new SecurityError(`Cannot update features for stream ${name}, insufficient privileges`);
    }

    const [stream, connector] = await Promise.all([
      streamsClient.getStream(name),
      inferenceClient.getConnectorById(connectorId),
    ]);

    const featureRegistry = getDefaultFeatureRegistry();
    const esClient = scopedClusterClient.asCurrentUser;
    const boundInferenceClient = inferenceClient.bindTo({ connectorId });
    const signal = getRequestAbortSignal(request);

    return from(
      featureRegistry
        .identifyFeatures({
          start: start.getTime(),
          end: end.getTime(),
          esClient,
          inferenceClient: boundInferenceClient,
          logger: logger.get('feature_identification'),
          stream,
          signal,
        })
        .then(async ({ features, tokensUsed }) => {
          await featureClient.bulk(
            name,
            features.map((feature) => ({
              index: { feature },
            }))
          );
          return { features, tokensUsed };
        })
    ).pipe(
      map(({ features, tokensUsed }) => {
        return {
          type: 'identified_features' as const,
          features,
          tokensUsed,
        };
      }),
      catchError((error: Error) => {
        throw createConnectorSSEError(error, connector);
      })
    );
  },
});

export const describeStreamRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/_describe_stream',
  options: {
    access: 'internal',
    summary: 'Generate a stream description',
    description: 'Generate a stream description based on data in the stream',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
    query: z.object({
      connectorId: z.string(),
      from: dateFromString,
      to: dateFromString,
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<Observable<StreamDescriptionEvent>> => {
    const {
      scopedClusterClient,
      licensing,
      uiSettingsClient,
      streamsClient,
      inferenceClient,
      soClient,
    } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { name },
      query: { connectorId, from: start, to: end },
    } = params;

    const { read } = await checkAccess({ name, scopedClusterClient });

    if (!read) {
      throw new SecurityError(
        `Cannot generate stream description for ${name}, insufficient privileges`
      );
    }

    // Get connector info for error enrichment
    const connector = await inferenceClient.getConnectorById(connectorId);

    const stream = await streamsClient.getStream(name);

    const promptsConfigService = new PromptsConfigService({
      soClient,
      logger,
    });

    const { descriptionPromptOverride } = await promptsConfigService.getPrompt();

    return from(
      generateStreamDescription({
        stream,
        esClient: scopedClusterClient.asCurrentUser,
        inferenceClient: inferenceClient.bindTo({ connectorId }),
        start: start.valueOf(),
        end: end.valueOf(),
        signal: getRequestAbortSignal(request),
        logger: logger.get('stream_description'),
        systemPromptOverride: descriptionPromptOverride,
      })
    ).pipe(
      map((result) => {
        return {
          type: 'stream_description' as const,
          description: result.description,
          tokensUsed: sumTokens(
            {
              prompt: 0,
              completion: 0,
              total: 0,
              cached: 0,
            },
            result.tokensUsed
          ),
        };
      }),
      catchError((error: Error) => {
        throw createConnectorSSEError(error, connector);
      })
    );
  },
});

export const featureRoutes = {
  ...upsertFeatureRoute,
  ...listFeaturesRoute,
  ...bulkFeaturesRoute,
  ...identifyFeaturesRoute,
  ...describeStreamRoute,
};
