/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conflict } from '@hapi/boom';
import { z } from '@kbn/zod';
import {
  baseFeatureSchema,
  featureStatusSchema,
  TaskStatus,
  type Feature,
} from '@kbn/streams-schema';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { resolveConnectorId } from '../../../utils/resolve_connector_id';
import { getFeatureId } from '../../../../lib/streams/feature/feature_client';
import {
  type IdentifyFeaturesResult,
  type FeaturesIdentificationTaskParams,
  getFeaturesIdentificationTaskId,
  FEATURES_IDENTIFICATION_TASK_TYPE,
} from '../../../../lib/tasks/task_definitions/features_identification';
import { isStale } from '../../../../lib/tasks/is_stale';
import { CancellationInProgressError } from '../../../../lib/tasks/cancellation_in_progress_error';
import { AcknowledgingIncompleteError } from '../../../../lib/tasks/acknowledging_incomplete_error';

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

export type FeaturesIdentificationTaskResult =
  | {
      status:
        | TaskStatus.NotStarted
        | TaskStatus.InProgress
        | TaskStatus.Stale
        | TaskStatus.BeingCanceled
        | TaskStatus.Canceled;
    }
  | {
      status: TaskStatus.Failed;
      error: string;
    }
  | ({
      status: TaskStatus.Completed | TaskStatus.Acknowledged;
    } & IdentifyFeaturesResult);

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

    const stream = await streamsClient.getStream(params.path.name);
    const task = await taskClient.get<FeaturesIdentificationTaskParams, IdentifyFeaturesResult>(
      getFeaturesIdentificationTaskId(stream.name)
    );

    if (task.status === TaskStatus.InProgress && isStale(task.created_at)) {
      return {
        status: TaskStatus.Stale,
      };
    } else if (task.status === TaskStatus.Failed) {
      return {
        status: TaskStatus.Failed,
        error: task.task.error,
      };
    } else if (task.status === TaskStatus.Completed || task.status === TaskStatus.Acknowledged) {
      return {
        status: task.status,
        ...task.task.payload,
      };
    }

    return {
      status: task.status,
    };
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
    body: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('schedule'),
        from: dateFromString,
        to: dateFromString,
        connectorId: z
          .string()
          .optional()
          .describe(
            'Optional connector ID. If not provided, the default AI connector from settings will be used.'
          ),
      }),
      z.object({
        action: z.literal('cancel'),
      }),
      z.object({
        action: z.literal('acknowledge'),
      }),
    ]),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<FeaturesIdentificationTaskResult> => {
    const { streamsClient, licensing, uiSettingsClient, taskClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const stream = await streamsClient.getStream(params.path.name);
    const taskId = getFeaturesIdentificationTaskId(stream.name);

    if (params.body.action === 'schedule') {
      const { from: start, to: end, connectorId: connectorIdParam } = params.body;

      const connectorId = await resolveConnectorId({
        connectorId: connectorIdParam,
        uiSettingsClient,
        logger,
      });

      try {
        await taskClient.schedule<FeaturesIdentificationTaskParams>({
          task: {
            type: FEATURES_IDENTIFICATION_TASK_TYPE,
            id: taskId,
            space: '*',
            stream: stream.name,
          },
          params: {
            connectorId,
            start: start.getTime(),
            end: end.getTime(),
          },
          request,
        });

        return {
          status: TaskStatus.InProgress,
        };
      } catch (error) {
        if (error instanceof CancellationInProgressError) {
          throw conflict(error.message);
        }

        throw error;
      }
    } else if (params.body.action === 'cancel') {
      await taskClient.cancel(taskId);

      return {
        status: TaskStatus.BeingCanceled,
      };
    }

    try {
      const task = await taskClient.acknowledge<
        FeaturesIdentificationTaskParams,
        IdentifyFeaturesResult
      >(taskId);

      return {
        status: TaskStatus.Acknowledged,
        ...task.task.payload,
      };
    } catch (error) {
      if (error instanceof AcknowledgingIncompleteError) {
        throw conflict(error.message);
      }

      throw error;
    }
  },
});

export const featureRoutes = {
  ...upsertFeatureRoute,
  ...deleteFeatureRoute,
  ...listFeaturesRoute,
  ...featuresStatusRoute,
  ...featuresTaskRoute,
};
