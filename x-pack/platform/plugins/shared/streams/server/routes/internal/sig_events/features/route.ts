/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { BooleanFromString } from '@kbn/zod-helpers/v4';
import type { IdentifyFeaturesResult, TaskResult } from '@kbn/streams-schema';
import { TaskStatus, baseFeatureSchema, featureSchema, type Feature } from '@kbn/streams-schema';
import { v4 as uuid } from 'uuid';
import { streamNamePredicate } from '../../../../lib/workflows/workflow_client';
import { searchModeSchema } from '../../../utils/search_mode';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { workflowExecutionToTaskResult } from '../../../utils/workflow_execution_to_task_result';

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

export const featuresStatusRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/features/_status',
  options: {
    access: 'internal',
    summary: 'Check the status of feature identification',
    description:
      'Feature identification happens as a background workflow execution. This endpoint returns the current status or last completed result.',
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
    featuresIdentificationWorkflowClient: workflowClient,
  }): Promise<FeaturesIdentificationTaskResult> => {
    const { streamsClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    if (!workflowClient) {
      return { status: TaskStatus.NotStarted };
    }

    const { name } = params.path;
    await streamsClient.ensureStream(name);

    const activeExecution = await workflowClient.getActiveExecution(streamNamePredicate(name));
    if (activeExecution) {
      return { status: TaskStatus.InProgress };
    }

    const lastCompleted = await workflowClient.getLastCompletedExecution(streamNamePredicate(name));
    if (lastCompleted) {
      const execution = await workflowClient.getStatus(lastCompleted.id);
      return workflowExecutionToTaskResult(execution);
    }

    return { status: TaskStatus.NotStarted };
  },
});

const workflowTaskActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('schedule').describe('Schedule a new KI features identification run'),
    from: dateFromString,
    to: dateFromString,
  }),
  z.object({
    action: z.literal('cancel').describe('Cancel an in-progress KI features identification run'),
  }),
]);

export const featuresTaskRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/features/_task',
  options: {
    access: 'internal',
    summary: 'Identify features in a stream',
    description: 'Identify features in a stream with an LLM via a background workflow execution.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
    body: workflowTaskActionSchema,
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    featuresIdentificationWorkflowClient: workflowClient,
  }): Promise<FeaturesIdentificationTaskResult> => {
    const { streamsClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    if (!workflowClient) {
      throw new Error('KI features identification workflow client is not available');
    }

    const {
      path: { name },
      body,
    } = params;
    await streamsClient.ensureStream(name);

    if (body.action === 'schedule') {
      await workflowClient.run(
        {
          streamName: name,
          start: body.from.getTime(),
          end: body.to.getTime(),
        },
        request
      );
      return { status: TaskStatus.InProgress };
    }

    const activeExecution = await workflowClient.getActiveExecution(streamNamePredicate(name));
    if (activeExecution) {
      await workflowClient.cancel(activeExecution.executionId);
      return { status: TaskStatus.BeingCanceled };
    }

    return { status: TaskStatus.NotStarted };
  },
});

export const featureRoutes = {
  ...upsertFeatureRoute,
  ...deleteFeatureRoute,
  ...listFeaturesRoute,
  ...listAllFeaturesRoute,
  ...bulkFeaturesRoute,
  ...featuresStatusRoute,
  ...featuresTaskRoute,
};
