/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { IdentifyFeaturesResult, TaskResult } from '@kbn/streams-schema';
import { baseFeatureSchema, featureSchema, type Feature } from '@kbn/streams-schema';
import { searchModeSchema } from '../../../utils/search_mode';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { StatusError } from '../../../../lib/streams/errors/status_error';
import {
  type FeaturesIdentificationTaskParams,
  getFeaturesIdentificationTaskId,
  FEATURES_IDENTIFICATION_TASK_TYPE,
} from '../../../../lib/tasks/task_definitions/features_identification';
import { taskActionSchema } from '../../../../lib/tasks/task_action_schema';
import { handleTaskAction } from '../../../utils/task_helpers';
import type { KIBulkOperation } from '../../../../lib/streams/ki';

export type FeaturesIdentificationTaskResult = TaskResult<IdentifyFeaturesResult>;

const dateFromString = z.string().transform((input) => new Date(input));

const includeExcludedQueryParam = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .optional()
  .describe('Legacy no-op. Excluded features are no longer stored separately.');

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
    const { getKnowledgeIndicatorClient, licensing, uiSettingsClient, streamsClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });
    await streamsClient.ensureStream(params.path.name);

    const kiClient = await getKnowledgeIndicatorClient();
    const featureBody = params.body;

    if (featureBody.id) {
      // Reject upserts that would silently move a feature across streams.
      // Ids are scoped to (stream_name, id), so we look up the id across all
      // streams the caller can see and bail if it lives in a different one.
      const streams = await streamsClient.listStreams();
      const streamNames = streams.map((s) => s.name);
      const { hits: existing } = await kiClient.getFeatures(streamNames, { id: [featureBody.id] });
      const conflict = existing.find((f) => f.stream_name !== params.path.name);
      if (conflict) {
        throw new StatusError(
          `Feature ${featureBody.id} belongs to stream '${conflict.stream_name}', not '${params.path.name}'`,
          400
        );
      }
    }

    await kiClient.bulk(params.path.name, [
      {
        index: {
          feature: featureBody,
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
    const { getKnowledgeIndicatorClient, licensing, uiSettingsClient, streamsClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });
    await streamsClient.ensureStream(params.path.name);

    const kiClient = await getKnowledgeIndicatorClient();
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
    path: z.object({ name: z.string() }),
    query: z.optional(
      z.object({
        query: z.string().optional(),
        search_mode: searchModeSchema.optional(),
        include_excluded: includeExcludedQueryParam,
      })
    ),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ features: Feature[] }> => {
    const { getKnowledgeIndicatorClient, licensing, uiSettingsClient, streamsClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });
    await streamsClient.ensureStream(params.path.name);

    const kiClient = await getKnowledgeIndicatorClient();
    const { query, search_mode: searchMode } = params.query ?? {};
    const { hits: features } = query
      ? await kiClient.findFeatures(params.path.name, query, { searchMode })
      : await kiClient.getFeatures(params.path.name);

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
        include_excluded: includeExcludedQueryParam,
      })
      .optional(),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ features: Feature[] }> => {
    const { getKnowledgeIndicatorClient, licensing, uiSettingsClient, streamsClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const streams = await streamsClient.listStreams();
    const streamNames = streams.map((stream) => stream.name);

    const kiClient = await getKnowledgeIndicatorClient();
    const { query, search_mode: searchMode } = params?.query ?? {};
    const { hits: features } = query
      ? await kiClient.findFeatures(streamNames, query, { searchMode })
      : await kiClient.getFeatures(streamNames);

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
    const { getKnowledgeIndicatorClient, streamsClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { name },
      body: { operations },
    } = params;

    await streamsClient.ensureStream(name);

    const kiClient = await getKnowledgeIndicatorClient();

    const kiOps: KIBulkOperation[] = operations.map((op) => {
      if ('index' in op) {
        return { index: { feature: op.index.feature } };
      }
      return { delete: { type: 'feature', id: op.delete.id } };
    });
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
      'Performs bulk delete operations on features across multiple streams in a single request. ' +
      'Client sends flat operations keyed by feature id; the server resolves stream ownership ' +
      'via kiClient.findFeatures and delegates per-stream to kiClient.bulk.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      operations: z.array(z.object({ delete: z.object({ id: z.string() }) })).min(1),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<{ succeeded: number; failed: number; skipped: number }> => {
    const { getKnowledgeIndicatorClient, licensing, uiSettingsClient, streamsClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const kiClient = await getKnowledgeIndicatorClient();

    // Resolve id → stream_name server-side. Ids not found in storage are
    // idempotent no-ops counted as `skipped` (matching the queries endpoint
    // pattern).
    const requestedIds = Array.from(new Set(params.body.operations.map((op) => op.delete.id)));
    const streams = await streamsClient.listStreams();
    const streamNames = streams.map((s) => s.name);
    const { hits: resolved } = await kiClient.getFeatures(streamNames, { id: requestedIds });

    const resolvedIds = new Set(resolved.map((f) => f.id));
    const skippedFromLookup = requestedIds.length - resolvedIds.size;

    const byStream = resolved.reduce<Record<string, string[]>>((acc, feature) => {
      if (!acc[feature.stream_name]) {
        acc[feature.stream_name] = [];
      }
      acc[feature.stream_name].push(feature.id);
      return acc;
    }, {});

    let succeeded = 0;
    let failed = 0;
    let skipped = skippedFromLookup;

    for (const [streamName, ids] of Object.entries(byStream)) {
      try {
        const ops: KIBulkOperation[] = ids.map((id) => ({
          delete: { type: 'feature', id },
        }));
        const { applied, skipped: streamSkipped } = await kiClient.bulk(streamName, ops);
        succeeded += applied;
        skipped += streamSkipped;
      } catch (error) {
        logger.error(
          `Bulk feature operation failed for stream ${streamName}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        failed += ids.length;
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
