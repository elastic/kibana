/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  streamObjectNameSchema,
  featureSchema,
  type Feature,
  featureTypeSchema,
} from '@kbn/streams-schema';
import type {
  StorageClientBulkResponse,
  StorageClientDeleteResponse,
  StorageClientIndexResponse,
} from '@kbn/storage-adapter';
import { conditionSchema } from '@kbn/streamlang';
import { generateStreamDescription } from '@kbn/streams-ai';
import type { Observable } from 'rxjs';
import { from, map } from 'rxjs';
import { createServerRoute } from '../../../create_server_route';
import { checkAccess } from '../../../../lib/streams/stream_crud';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import type { IdentifiedFeaturesEvent, StreamDescriptionEvent } from './types';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';
import { getDefaultFeatureRegistry } from '@kbn/streams-plugin/server/lib/streams/feature/feature_type_registry';

const dateFromString = z.string().transform((input) => new Date(input));

export const getFeatureRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/features/{featureType}/{featureName}',
  options: {
    access: 'internal',
    summary: 'Get a feature for a stream',
    description: 'Fetches the specified feature',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
      featureType: featureTypeSchema,
      featureName: streamObjectNameSchema,
    }),
  }),
  handler: async ({ params, request, getScopedClients, server }): Promise<{ feature: Feature }> => {
    const { featureClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { name, featureType, featureName } = params.path;

    const { read } = await checkAccess({ name, scopedClusterClient });

    if (!read) {
      throw new SecurityError(`Cannot read stream ${name}, insufficient privileges`);
    }

    const feature = await featureClient.getFeature(name, { type: featureType, name: featureName });

    return { feature };
  },
});

export const deleteFeatureRoute = createServerRoute({
  endpoint: 'DELETE /internal/streams/{name}/features/{featureType}/{featureName}',
  options: {
    access: 'internal',
    summary: 'Delete a feature for a stream',
    description: 'Deletes the specified feature',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
      featureType: z.string(),
      featureName: streamObjectNameSchema,
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<StorageClientDeleteResponse> => {
    const { featureClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { name, featureName, featureType } = params.path;

    const { write } = await checkAccess({ name, scopedClusterClient });

    if (!write) {
      throw new SecurityError(`Cannot delete feature for stream ${name}, insufficient privileges`);
    }

    return await featureClient.deleteFeature(name, { type: featureType, name: featureName });
  },
});

export const updateFeatureRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/{name}/features/{featureType}/{featureName}',
  options: {
    access: 'internal',
    summary: 'Updates a feature for a stream',
    description: 'Updates the specified feature',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ name: z.string(), featureType: featureTypeSchema, featureName: z.string() }),
    body: z.object({
      description: z.string(),
      filter: z.optional(conditionSchema),
    }),
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
      path: { name, featureType, featureName },
      body,
    } = params;

    const { write } = await checkAccess({ name, scopedClusterClient });

    if (!write) {
      throw new SecurityError(`Cannot update features for stream ${name}, insufficient privileges`);
    }

    const feature = await featureClient.getFeature(name, { type: featureType, name: featureName });
    return await featureClient.updateFeature(name, { ...feature, ...body });
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

    const { hits: features } = await featureClient.getFeatures(name);

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
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
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
              feature: z.object({
                type: featureTypeSchema,
                name: streamObjectNameSchema,
              }),
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

    const { write } = await checkAccess({ name, scopedClusterClient });

    if (!write) {
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
    } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { name },
      query: { connectorId, from: start, to: end },
    } = params;

    const { write } = await checkAccess({ name, scopedClusterClient });

    if (!write) {
      throw new SecurityError(`Cannot update features for stream ${name}, insufficient privileges`);
    }

    const [{ hits }, stream] = await Promise.all([
      featureClient.getFeatures(name),
      streamsClient.getStream(name),
    ]);

    const esClient = scopedClusterClient.asCurrentUser;

    const boundInferenceClient = inferenceClient.bindTo({ connectorId });
    const signal = getRequestAbortSignal(request);
    const featureRegistry = getDefaultFeatureRegistry();

    return from(
      featureRegistry.identifyFeatures({
        start: start.getTime(),
        end: end.getTime(),
        esClient,
        inferenceClient: boundInferenceClient,
        logger,
        stream,
        features: hits,
        signal,
      })
    ).pipe(
      map(({ features }) => {
        return {
          type: 'identified_features',
          features,
        };
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
  }): Promise<Observable<StreamDescriptionEvent>> => {
    const { scopedClusterClient, licensing, uiSettingsClient, streamsClient, inferenceClient } =
      await getScopedClients({
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

    const stream = await streamsClient.getStream(name);

    return from(
      generateStreamDescription({
        stream,
        esClient: scopedClusterClient.asCurrentUser,
        inferenceClient: inferenceClient.bindTo({ connectorId }),
        start: start.valueOf(),
        end: end.valueOf(),
        signal: getRequestAbortSignal(request),
      })
    ).pipe(
      map((description) => {
        return {
          type: 'stream_description',
          description,
        };
      })
    );
  },
});

export const featureRoutes = {
  ...getFeatureRoute,
  ...deleteFeatureRoute,
  ...updateFeatureRoute,
  ...listFeaturesRoute,
  ...bulkFeaturesRoute,
  ...identifyFeaturesRoute,
  ...describeStreamRoute,
};
