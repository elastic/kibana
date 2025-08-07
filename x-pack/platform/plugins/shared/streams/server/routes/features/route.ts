/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { badRequest } from '@hapi/boom';
import {
  upsertStreamFeatureRequestSchema,
  type IdentifiedFeatureEventsGenerateResponse,
  type StreamFeature,
} from '@kbn/streams-schema';
import { createTracedEsClient } from '@kbn/traced-es-client';
import { z } from '@kbn/zod';
import { from as fromRxjs, map } from 'rxjs';
import { STREAMS_API_PRIVILEGES } from '../../../common/constants';
import { identifySystemFeatures } from '../../lib/significant_events/identify_system_features';
import { createServerRoute } from '../create_server_route';
import { dateFromString, durationSchema } from '../significant_events/route';
import { assertEnterpriseLicense } from '../utils/assert_enterprise_license';

export interface ListFeatureResponse {
  features: StreamFeature[];
}

export interface UpsertFeatureResponse {
  acknowledged: boolean;
}

const listFeaturesRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/features 2023-10-31',
  options: {
    access: 'public',
    summary: 'Get stream queries',
    description:
      'Fetches all queries linked to a stream that are visible to the current user in the current space.',
    availability: {
      stability: 'experimental',
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  async handler({ params, request, getScopedClients }): Promise<ListFeatureResponse> {
    const { assetClient, streamsClient, licensing } = await getScopedClients({ request });
    await assertEnterpriseLicense(licensing);
    await streamsClient.ensureStream(params.path.name);

    const {
      path: { name: streamName },
    } = params;

    const featureLinks = await assetClient.getAssetLinks(streamName, ['feature']);

    return {
      features: featureLinks.map((link) => ({ ...link.feature })),
    };
  },
});

const upsertFeatureRoute = createServerRoute({
  endpoint: 'PUT /api/streams/{name}/features/{featureId} 2023-10-31',
  options: {
    access: 'public',
    summary: 'Upsert a feature to a stream',
    description:
      'Adds a feature to a stream. Update the feature when already present on the stream.',
    availability: {
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
      featureId: z.string(),
    }),
    body: upsertStreamFeatureRequestSchema,
  }),
  handler: async ({ params, request, getScopedClients }): Promise<UpsertFeatureResponse> => {
    const { streamsClient, licensing, assetClient } = await getScopedClients({
      request,
    });
    const {
      path: { name: streamName, featureId },
      body,
    } = params;
    await assertEnterpriseLicense(licensing);

    await streamsClient.ensureStream(streamName);
    await assetClient.linkAsset(streamName, {
      'asset.type': 'feature',
      'asset.id': featureId,
      feature: {
        id: featureId,
        feature: body.feature,
      },
    });

    return {
      acknowledged: true,
    };
  },
});

const generateSystemFeaturesRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/features/_generate 2023-10-31',
  params: z.object({
    path: z.object({ name: z.string() }),
    query: z.object({
      connectorId: z.string(),
      currentDate: dateFromString.optional(),
      shortLookback: durationSchema.optional(),
    }),
  }),
  options: {
    access: 'public',
    summary: 'identify the system features using LLM',
    description: 'identify the system features using LLM',
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
    logger,
  }): Promise<IdentifiedFeatureEventsGenerateResponse> => {
    const { streamsClient, scopedClusterClient, licensing, inferenceClient } =
      await getScopedClients({
        request,
      });
    await assertEnterpriseLicense(licensing);

    const isStreamEnabled = await streamsClient.isStreamsEnabled();
    if (!isStreamEnabled) {
      throw badRequest('Streams are not enabled');
    }

    return fromRxjs(
      identifySystemFeatures(
        {
          name: params.path.name,
          connectorId: params.query.connectorId,
          currentDate: params.query.currentDate,
          shortLookback: params.query.shortLookback,
        },
        {
          inferenceClient,
          esClient: createTracedEsClient({
            client: scopedClusterClient.asCurrentUser,
            logger,
            plugin: 'streams',
          }),
          logger,
        }
      )
    ).pipe(
      map((feature) => ({
        feature,
        type: 'identified_feature' as const,
      }))
    );
  },
});

export const featureRoutes = {
  ...listFeaturesRoute,
  ...upsertFeatureRoute,
  ...generateSystemFeaturesRoute,
};
