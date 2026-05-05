/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { BooleanFromString } from '@kbn/zod-helpers/v4';
import type { IdentifyFeaturesResult, TaskResult } from '@kbn/streams-schema';
import { baseFeatureSchema, featureSchema, type Feature } from '@kbn/streams-schema';
import { v4 as uuid } from 'uuid';
import { searchModeSchema } from '../../../utils/search_mode';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import {
  type FeaturesIdentificationTaskParams,
  getFeaturesIdentificationTaskId,
  FEATURES_IDENTIFICATION_TASK_TYPE,
} from '../../../../lib/tasks/task_definitions/features_identification';
import { taskActionSchema } from '../../../../lib/tasks/task_action_schema';
import { handleTaskAction } from '../../../utils/task_helpers';
import type { FeatureBulkOperation } from '../../../../lib/streams/feature/feature_client';

export type FeaturesIdentificationTaskResult = TaskResult<IdentifyFeaturesResult>;

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
    const { getFeatureClient, licensing, uiSettingsClient, streamsClient } = await getScopedClients(
      {
        request,
      }
    );

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });
    await streamsClient.ensureStream(params.path.name);

    const featureClient = await getFeatureClient();
    await featureClient.bulk(params.path.name, [
      {
        index: {
          feature: {
            ...params.body,
            status: 'active' as const,
            last_seen: new Date().toISOString(),
            uuid: uuid(),
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

export const featuresStatusRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/features/_status',
  options: {
    access: 'internal',
    summary: 'Check the status of feature identification',
    description:
      'Feature identification happens as a background task, this endpoints allows the user to check the status of this task. This endpoints combine with POST /internal/streams/{name}/features/_task which manages the task lifecycle.',
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
  }): Promise<FeaturesIdentificationTaskResult> => {
    const { streamsClient, licensing, uiSettingsClient, taskClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { name } = params.path;
    await streamsClient.ensureStream(name);

    return taskClient.getStatus<FeaturesIdentificationTaskParams, IdentifyFeaturesResult>(
      getFeaturesIdentificationTaskId(name)
    );
  },
});

export const featuresTaskRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/features/_task',
  options: {
    access: 'internal',
    summary: 'Identify features in a stream',
    description:
      'Identify features in a stream with an LLM, this happens as a background task and this endpoint manages the task lifecycle.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
    body: taskActionSchema({
      from: dateFromString,
      to: dateFromString,
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<FeaturesIdentificationTaskResult> => {
    const { streamsClient, licensing, uiSettingsClient, taskClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { name },
      body,
    } = params;
    await streamsClient.ensureStream(name);

    const taskId = getFeaturesIdentificationTaskId(name);

    const actionParams =
      body.action === 'schedule'
        ? ({
            action: body.action,
            scheduleConfig: {
              taskType: FEATURES_IDENTIFICATION_TASK_TYPE,
              taskId,
              params: {
                start: body.from.getTime(),
                end: body.to.getTime(),
                streamName: name,
              },
              request,
            },
          } as const)
        : ({ action: body.action } as const);

    return handleTaskAction<FeaturesIdentificationTaskParams, IdentifyFeaturesResult>({
      taskClient,
      taskId,
      ...actionParams,
    });
  },
});

export const featureRoutes = {
  ...upsertFeatureRoute,
  ...deleteFeatureRoute,
  ...listFeaturesRoute,
  ...listAllFeaturesRoute,
  ...bulkFeaturesRoute,
  ...bulkFeaturesAcrossStreamsRoute,
  ...featuresStatusRoute,
  ...featuresTaskRoute,
};
