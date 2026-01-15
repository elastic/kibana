/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { baseFeatureSchema, featureStatusSchema, type Feature } from '@kbn/streams-schema';
import { identifyFeatures } from '@kbn/streams-ai';
import type { Observable } from 'rxjs';
import { from, map, catchError } from 'rxjs';
import { createConnectorSSEError } from '../../../utils/create_connector_sse_error';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';
import type { IdentifiedFeaturesEvent } from './types';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { PromptsConfigService } from '../../../../lib/saved_objects/significant_events/prompts_config_service';
import { resolveConnectorId } from '../../../utils/resolve_connector_id';
import { getFeatureId } from '../../../../lib/streams/feature/feature_client';

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
    body: baseFeatureSchema,
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ acknowledged: boolean }> => {
    const { featureClient, licensing, uiSettingsClient, streamsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const stream = await streamsClient.getStream(params.path.name);
    await featureClient.bulk(stream.name, [
      {
        index: {
          feature: {
            ...params.body,
            status: 'active' as const,
            last_seen: new Date().toISOString(),
            id: getFeatureId(stream.name, params.body),
          },
        },
      },
    ]);

    return { acknowledged: true };
  },
});

export const deleteFeatureRoute = createServerRoute({
  endpoint: 'DELETE /internal/streams/{name}/features/{id}',
  options: {
    access: 'internal',
    summary: 'Deletes a feature for a stream',
    description: 'Deletes the specified feature',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ name: z.string(), id: z.string() }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ acknowledged: boolean }> => {
    const { featureClient, licensing, uiSettingsClient, streamsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const stream = await streamsClient.getStream(params.path.name);
    await featureClient.deleteFeature(stream.name, params.path.id);

    return { acknowledged: true };
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
    query: z.optional(
      z.object({
        status: featureStatusSchema.optional(),
        type: z.string().optional(),
      })
    ),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ features: Feature[] }> => {
    const { featureClient, licensing, uiSettingsClient, streamsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const stream = await streamsClient.getStream(params.path.name);
    const { hits: features } = await featureClient.getFeatures(stream.name, {
      type: params.query?.type ? [params.query.type] : [],
      status: params.query?.status ? [params.query.status] : [],
    });

    return {
      features,
    };
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
      connectorId: z
        .string()
        .optional()
        .describe(
          'Optional connector ID. If not provided, the default AI connector from settings will be used.'
        ),
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
      soClient,
      licensing,
      uiSettingsClient,
      streamsClient,
      inferenceClient,
    } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const [stream, { featurePromptOverride }] = await Promise.all([
      streamsClient.getStream(params.path.name),
      new PromptsConfigService({ soClient, logger }).getPrompt(),
    ]);

    const connectorId = await resolveConnectorId({
      connectorId: params.query.connectorId,
      uiSettingsClient,
      logger,
    });
    const boundInferenceClient = inferenceClient.bindTo({ connectorId });
    const esClient = scopedClusterClient.asCurrentUser;
    const signal = getRequestAbortSignal(request);

    return from(
      identifyFeatures({
        start: params.query.from.getTime(),
        end: params.query.to.getTime(),
        esClient,
        inferenceClient: boundInferenceClient,
        logger: logger.get('feature_identification'),
        stream,
        prompt: featurePromptOverride,
        signal,
      }).then(async ({ features: baseFeatures, tokensUsed }) => {
        const now = new Date().toISOString();
        const features = baseFeatures.map((feature) => ({
          ...feature,
          status: 'active' as const,
          last_seen: now,
          id: getFeatureId(stream.name, feature),
        }));

        await featureClient.bulk(
          stream.name,
          features.map((feature) => ({ index: { feature } }))
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
      catchError(async (error: Error) => {
        const connector = await inferenceClient.getConnectorById(connectorId);
        throw createConnectorSSEError(error, connector);
      })
    );
  },
});

export const featureRoutes = {
  ...upsertFeatureRoute,
  ...deleteFeatureRoute,
  ...listFeaturesRoute,
  ...identifyFeaturesRoute,
};
