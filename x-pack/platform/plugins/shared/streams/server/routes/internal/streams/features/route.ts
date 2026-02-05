/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { IdentifyFeaturesResult, TaskResult } from '@kbn/streams-schema';
import { baseFeatureSchema, featureSchema, type Feature } from '@kbn/streams-schema';
import { v4 as uuid } from 'uuid';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { resolveConnectorId } from '../../../utils/resolve_connector_id';
import {
  type FeaturesIdentificationTaskParams,
  getFeaturesIdentificationTaskId,
  FEATURES_IDENTIFICATION_TASK_TYPE,
} from '../../../../lib/tasks/task_definitions/features_identification';
import { taskActionSchema } from '../../../../lib/tasks/task_action_schema';
import { handleTaskAction } from '../../../utils/task_helpers';

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
    await streamsClient.ensureStream(params.path.name);

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
    const { featureClient, licensing, uiSettingsClient, streamsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });
    await streamsClient.ensureStream(params.path.name);

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
    await streamsClient.ensureStream(params.path.name);

    const { hits: features } = await featureClient.getFeatures(params.path.name, {
      type: params.query?.type ? [params.query.type] : [],
    });

    return {
      features,
    };
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
  handler: async ({ request, getScopedClients, server }): Promise<{ features: Feature[] }> => {
    const { featureClient, licensing, uiSettingsClient, streamsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const streams = await streamsClient.listStreams();
    const streamNames = streams.map((stream) => stream.name);

    const { hits: features } = await featureClient.getAllFeatures(streamNames);

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
  }): Promise<{ acknowledged: boolean }> => {
    const { featureClient, streamsClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { name },
      body: { operations },
    } = params;

    await streamsClient.ensureStream(name);

    await featureClient.bulk(name, operations);

    return { acknowledged: true };
  },
});

export type FeaturesIdentificationTaskResult = TaskResult<IdentifyFeaturesResult>;

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

    return await taskClient.getStatus<FeaturesIdentificationTaskParams, IdentifyFeaturesResult>(
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
      connector_id: z
        .string()
        .optional()
        .describe(
          'Optional connector ID. If not provided, the default AI connector from settings will be used.'
        ),
    }),
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
              params: await (async (): Promise<FeaturesIdentificationTaskParams> => {
                const connectorId = await resolveConnectorId({
                  connectorId: body.connector_id,
                  uiSettingsClient,
                  logger,
                });
                return {
                  connectorId,
                  start: body.from.getTime(),
                  end: body.to.getTime(),
                  streamName: name,
                };
              })(),
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
  ...featuresStatusRoute,
  ...featuresTaskRoute,
};
