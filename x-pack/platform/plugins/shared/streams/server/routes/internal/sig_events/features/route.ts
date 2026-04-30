/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { BooleanFromString } from '@kbn/zod-helpers/v4';
import { baseFeatureSchema, featureSchema, type Feature } from '@kbn/streams-schema';
import { v4 as uuid } from 'uuid';
import { searchModeSchema } from '../../../utils/search_mode';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { StatusError } from '../../../../lib/streams/errors/status_error';
import {
  STREAMS_API_PRIVILEGES,
  KI_FEATURES_IDENTIFICATION_WORKFLOW_UUID,
} from '../../../../../common/constants';
import type { FeatureBulkOperation } from '../../../../lib/streams/feature/feature_client';
import {
  WorkflowExecutionClient,
  type WorkflowExecutionResult,
} from '../../../../lib/workflows/workflow_execution_client';

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
    body: baseFeatureSchema.and(z.object({ uuid: z.string().optional() })),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ acknowledged: boolean }> => {
    const { getFeatureClient, licensing, uiSettingsClient, streamsClient } = await getScopedClients(
      {
        request,
      }
    );

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });
    await streamsClient.ensureStream(params.path.name);

    const featureClient = await getFeatureClient();
    const { uuid: existingUuid, ...baseBody } = params.body;

    if (existingUuid) {
      const [resolved] = await featureClient.findFeaturesByUuids([existingUuid]);
      if (!resolved) {
        throw new StatusError(`Feature ${existingUuid} not found`, 404);
      }
      if (resolved.stream_name !== params.path.name) {
        throw new StatusError(
          `Feature ${existingUuid} belongs to stream '${resolved.stream_name}', not '${params.path.name}'`,
          400
        );
      }
    }

    await featureClient.bulk(params.path.name, [
      {
        index: {
          feature: {
            ...baseBody,
            status: 'active' as const,
            last_seen: new Date().toISOString(),
            uuid: existingUuid ?? uuid(),
          },
        },
      },
    ]);

    return { acknowledged: true };
  },
});

export const deleteFeatureRoute = createServerRoute({
  endpoint: 'DELETE /internal/streams/{name}/features/{uuid}',
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
    path: z.object({ name: z.string(), uuid: z.string() }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ acknowledged: boolean }> => {
    const { getFeatureClient, licensing, uiSettingsClient, streamsClient } = await getScopedClients(
      {
        request,
      }
    );

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });
    await streamsClient.ensureStream(params.path.name);

    const featureClient = await getFeatureClient();
    await featureClient.deleteFeature(params.path.name, params.path.uuid);

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
    const { getFeatureClient, licensing, uiSettingsClient, streamsClient } = await getScopedClients(
      {
        request,
      }
    );

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });
    await streamsClient.ensureStream(params.path.name);

    const featureClient = await getFeatureClient();
    const {
      query,
      search_mode: searchMode,
      include_excluded: includeExcluded,
    } = params.query ?? {};
    const { hits: features } = query
      ? await featureClient.findFeatures(params.path.name, query, { searchMode, includeExcluded })
      : await featureClient.getFeatures(params.path.name, { includeExcluded });

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
    const { getFeatureClient, licensing, uiSettingsClient, streamsClient } = await getScopedClients(
      {
        request,
      }
    );

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const streams = await streamsClient.listStreams();
    const streamNames = streams.map((stream) => stream.name);

    const featureClient = await getFeatureClient();
    const {
      query,
      search_mode: searchMode,
      include_excluded: includeExcluded,
    } = params?.query ?? {};
    const { hits: features } = query
      ? await featureClient.findFeatures(streamNames, query, { searchMode, includeExcluded })
      : await featureClient.getFeatures(streamNames, { includeExcluded });

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
              feature: featureSchema,
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
    const { getFeatureClient, streamsClient, licensing, uiSettingsClient } = await getScopedClients(
      {
        request,
      }
    );

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { name },
      body: { operations },
    } = params;

    await streamsClient.ensureStream(name);

    const featureClient = await getFeatureClient();
    await featureClient.bulk(name, operations);

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
    const { getFeatureClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const featureClient = await getFeatureClient();

    // Resolve UUID → stream_name server-side. UUIDs not found in storage are
    // idempotent no-ops counted as `skipped` (matching the queries endpoint
    // pattern, which uses getQueryLinks for the same purpose).
    const opsByUuid = new Map<string, FeatureBulkOperation>();
    for (const op of params.body.operations) {
      const id = 'delete' in op ? op.delete.id : 'exclude' in op ? op.exclude.id : op.restore.id;
      // Last write wins on duplicate UUIDs in the input — caller shouldn't
      // pass duplicates, but if they do, the latter op replaces the former.
      opsByUuid.set(id, op);
    }
    const requestedUuids = Array.from(opsByUuid.keys());
    const resolved = await featureClient.findFeaturesByUuids(requestedUuids);
    const skippedFromLookup = requestedUuids.length - resolved.length;

    // Group resolved ops by stream.
    const byStream = resolved.reduce<Record<string, FeatureBulkOperation[]>>(
      (acc, { uuid: featureUuid, stream_name: streamName }) => {
        const op = opsByUuid.get(featureUuid);
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

    // featureClient.bulk silently drops exclude/restore ops targeting computed
    // features (and any stale UUIDs that slipped through between the lookup
    // and the bulk call). Both classes show up as additional `skipped` count.
    // Only thrown batches count as `failed`.
    let succeeded = 0;
    let failed = 0;
    let skipped = skippedFromLookup;

    for (const [streamName, ops] of Object.entries(byStream)) {
      try {
        const { applied, skipped: streamSkipped } = await featureClient.bulk(streamName, ops);
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

export const featuresRunRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/features/_run',
  options: {
    access: 'internal',
    summary: 'Run features identification workflow for a stream',
    description:
      'Triggers the features identification workflow to identify features in a stream using an LLM.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
    body: z.object({
      from: dateFromString,
      to: dateFromString,
      connectorId: z.string().optional(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    workflowsManagementApi,
  }): Promise<WorkflowExecutionResult> => {
    const { streamsClient, licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    if (!workflowsManagementApi) {
      throw new Error('Workflows management is not available');
    }

    const { name } = params.path;
    await streamsClient.ensureStream(name);

    const client = new WorkflowExecutionClient(
      workflowsManagementApi,
      KI_FEATURES_IDENTIFICATION_WORKFLOW_UUID
    );

    return client.run(
      {
        streamName: name,
        start: params.body.from.getTime(),
        end: params.body.to.getTime(),
        ...(params.body.connectorId && { connectorId: params.body.connectorId }),
      },
      request
    );
  },
});

export const featuresExecutionRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/features/_execution',
  options: {
    access: 'internal',
    summary: 'Get the latest features identification workflow execution for a stream',
    description:
      'Returns the latest workflow execution status and output for features identification on the given stream.',
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
    workflowsManagementApi,
  }): Promise<WorkflowExecutionResult> => {
    const { streamsClient, licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    if (!workflowsManagementApi) {
      throw new Error('Workflows management is not available');
    }

    const { name } = params.path;
    await streamsClient.ensureStream(name);

    const client = new WorkflowExecutionClient(
      workflowsManagementApi,
      KI_FEATURES_IDENTIFICATION_WORKFLOW_UUID
    );

    return client.getLatestExecution(name);
  },
});

export const featuresCancelRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/features/_cancel',
  options: {
    access: 'internal',
    summary: 'Cancel running features identification workflow for a stream',
    description:
      'Cancels the currently running features identification workflow execution for the given stream.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
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
    workflowsManagementApi,
  }): Promise<{ acknowledged: boolean }> => {
    const { streamsClient, licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    if (!workflowsManagementApi) {
      throw new Error('Workflows management is not available');
    }

    const { name } = params.path;
    await streamsClient.ensureStream(name);

    const client = new WorkflowExecutionClient(
      workflowsManagementApi,
      KI_FEATURES_IDENTIFICATION_WORKFLOW_UUID
    );

    await client.cancelExecution(name);

    return { acknowledged: true };
  },
});

export const featureRoutes = {
  ...upsertFeatureRoute,
  ...deleteFeatureRoute,
  ...listFeaturesRoute,
  ...listAllFeaturesRoute,
  ...bulkFeaturesRoute,
  ...bulkFeaturesAcrossStreamsRoute,
  ...featuresRunRoute,
  ...featuresExecutionRoute,
  ...featuresCancelRoute,
};
