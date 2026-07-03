/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { BooleanFromString } from '@kbn/zod-helpers/v4';
import {
  baseFeatureSchema,
  featureUpsertSchema,
  type Feature,
} from '@kbn/significant-events-schema';
import { searchModeSchema } from '../../../../utils/search_mode';
import { createServerRoute } from '../../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../../utils/assert_significant_events_access';
import { STREAMS_API_PRIVILEGES } from '../../../../../../common/constants';
import { StatusError } from '../../../../../lib/streams/errors/status_error';
import type { KIBulkOperation } from '../../../../../lib/streams/ki';

const MAX_INPUT_STRING_LENGTH = 255;

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
    body: baseFeatureSchema.and(z.object({ expires_at: z.iso.datetime().optional() })),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ acknowledged: boolean }> => {
    const scopedClients = await getScopedClients({ request });
    const { licensing, uiSettingsClient, streamsClient } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });
    await streamsClient.ensureStream(params.path.name);

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    const { id, expires_at, ...baseBody } = params.body;

    if (id) {
      const { hits } = await kiClient.getFeatures(params.path.name, { id: [id] });
      const [resolved] = hits;
      if (resolved && resolved.stream_name !== params.path.name) {
        throw new StatusError(
          `Feature ${id} belongs to stream '${resolved.stream_name}', not '${params.path.name}'`,
          400
        );
      }
    }

    await kiClient.bulk(params.path.name, [
      {
        index: {
          feature: {
            id,
            ...baseBody,
            updated_at: new Date().toISOString(),
            expires_at,
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
    path: z.object({
      name: z.string().max(MAX_INPUT_STRING_LENGTH),
      id: z.string().max(MAX_INPUT_STRING_LENGTH),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ acknowledged: boolean }> => {
    const scopedClients = await getScopedClients({ request });
    const { licensing, uiSettingsClient, streamsClient } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });
    await streamsClient.ensureStream(params.path.name);

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    await kiClient.bulk(params.path.name, [{ delete: { type: 'feature', id: params.path.id } }]);

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
    path: z.object({ name: z.string().max(MAX_INPUT_STRING_LENGTH) }),
    query: z.optional(
      z.object({
        query: z.string().optional(),
        search_mode: searchModeSchema.optional(),
        include_excluded: BooleanFromString.optional(),
      })
    ),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ features: Feature[] }> => {
    const scopedClients = await getScopedClients({ request });
    const { licensing, uiSettingsClient, streamsClient } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });
    await streamsClient.ensureStream(params.path.name);

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    const {
      query,
      search_mode: searchMode,
      include_excluded: includeExcluded,
    } = params.query ?? {};
    const { hits: features } = query
      ? await kiClient.findFeatures(params.path.name, query, { searchMode, includeExcluded })
      : await kiClient.getFeatures(params.path.name, { includeExcluded });

    return { features };
  },
});

export const listAllFeaturesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_features',
  options: {
    access: 'internal',
    summary: 'Lists all features across streams',
    description: 'Fetches all features the user has access to',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: z
      .object({
        query: z.string().optional().describe('Free-text query for semantic/keyword search'),
        search_mode: searchModeSchema.optional(),
        include_excluded: BooleanFromString.optional(),
      })
      .optional(),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ features: Feature[] }> => {
    const scopedClients = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({
      server,
      licensing: scopedClients.licensing,
      uiSettingsClient: scopedClients.uiSettingsClient,
    });

    const streams = await scopedClients.streamsClient.listStreams();
    const streamNames = streams.map((stream) => stream.name);

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    const {
      query,
      search_mode: searchMode,
      include_excluded: includeExcluded,
    } = params?.query ?? {};
    const { hits: features } = query
      ? await kiClient.findFeatures(streamNames, query, { searchMode, includeExcluded })
      : await kiClient.getFeatures(streamNames, { includeExcluded });

    return { features };
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
              feature: featureUpsertSchema,
            }),
          }),
          z.object({
            delete: z.object({
              id: z.string(),
            }),
          }),
          z.object({
            exclude: z.object({
              id: z.string(),
            }),
          }),
          z.object({
            restore: z.object({
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
  }): Promise<{ acknowledged: boolean }> => {
    const scopedClients = await getScopedClients({
      request,
    });
    const { streamsClient, licensing, uiSettingsClient } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { name },
      body: { operations },
    } = params;

    await streamsClient.ensureStream(name);

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();
    const kiOps: KIBulkOperation[] = operations.map((op) =>
      'delete' in op ? { delete: { type: 'feature' as const, id: op.delete.id } } : op
    );
    await kiClient.bulk(name, kiOps);

    return { acknowledged: true };
  },
});

export const bulkFeaturesAcrossStreamsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/features/_bulk',
  options: {
    access: 'internal',
    summary: 'Bulk feature operations across streams',
    description:
      'Performs bulk delete / exclude / restore operations on features across multiple streams in a single request. Client sends flat operations keyed by feature UUID; the server resolves stream ownership via featureClient.findFeaturesByUuids and delegates per-stream to featureClient.bulk.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      operations: z
        .array(
          z.union([
            z.object({ delete: z.object({ id: z.string() }) }),
            z.object({ exclude: z.object({ id: z.string() }) }),
            z.object({ restore: z.object({ id: z.string() }) }),
          ])
        )
        .min(1),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<{ succeeded: number; failed: number; skipped: number }> => {
    const scopedClients = await getScopedClients({
      request,
    });
    const { licensing, uiSettingsClient } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const kiClient = await scopedClients.getKnowledgeIndicatorClient();

    // Resolve UUID → stream_name server-side. UUIDs not found in storage are
    // idempotent no-ops counted as `skipped` (matching the queries endpoint
    // pattern, which uses getQueryLinks for the same purpose).
    const opsByUuid = new Map<string, KIBulkOperation>();
    for (const op of params.body.operations) {
      const id = 'delete' in op ? op.delete.id : 'exclude' in op ? op.exclude.id : op.restore.id;
      const kiOp: KIBulkOperation =
        'delete' in op ? { delete: { type: 'feature', id: op.delete.id } } : op;
      opsByUuid.set(id, kiOp);
    }
    const requestedUuids = Array.from(opsByUuid.keys());
    const resolved = await kiClient.findFeaturesByIds(requestedUuids);
    const skippedFromLookup = requestedUuids.length - resolved.length;

    // Group resolved ops by stream.
    const byStream = resolved.reduce<Record<string, KIBulkOperation[]>>(
      (acc, { id: featureId, stream_name: streamName }) => {
        const op = opsByUuid.get(featureId);
        if (!op) {
          return acc;
        }
        if (!acc[streamName]) {
          acc[streamName] = [];
        }
        acc[streamName].push(op);
        return acc;
      },
      {}
    );

    // kiClient.bulk silently drops exclude/restore ops targeting computed
    // features (and any stale UUIDs that slipped through between the lookup
    // and the bulk call). Both classes show up as additional `skipped` count.
    // Only thrown batches count as `failed`.
    let succeeded = 0;
    let failed = 0;
    let skipped = skippedFromLookup;

    for (const [streamName, ops] of Object.entries(byStream)) {
      try {
        const { applied, skipped: streamSkipped } = await kiClient.bulk(streamName, ops);
        succeeded += applied;
        skipped += streamSkipped;
      } catch (error) {
        logger.error(
          `Bulk feature operation failed for stream ${streamName}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        failed += ops.length;
      }
    }

    return { succeeded, failed, skipped };
  },
});

export const internalSignificantEventsKIFeatureRoutes = {
  ...upsertFeatureRoute,
  ...deleteFeatureRoute,
  ...listFeaturesRoute,
  ...listAllFeaturesRoute,
  ...bulkFeaturesRoute,
  ...bulkFeaturesAcrossStreamsRoute,
};
