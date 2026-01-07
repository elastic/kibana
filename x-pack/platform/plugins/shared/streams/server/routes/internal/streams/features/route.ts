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
import { generateStreamDescription, sumTokens } from '@kbn/streams-ai';
import type { Observable } from 'rxjs';
import { catchError, from, map } from 'rxjs';
import { BooleanFromString } from '@kbn/zod-helpers';
import { conflict } from '@hapi/boom';
import type { IdentifyFeaturesResult } from '../../../../lib/streams/feature/feature_type_registry';
import { AcknowledgingIncompleteError } from '../../../../lib/tasks/acknowledging_incomplete_error';
import { CancellationInProgressError } from '../../../../lib/tasks/cancellation_in_progress_error';
import { isStale } from '../../../../lib/tasks/is_stale';
import { PromptsConfigService } from '../../../../lib/saved_objects/significant_events/prompts_config_service';
import type { FeatureIdentificationTaskParams } from '../../../../lib/tasks/task_definitions/feature_identification';
import { resolveConnectorId } from '../../../utils/resolve_connector_id';
import { StatusError } from '../../../../lib/streams/errors/status_error';
import { createServerRoute } from '../../../create_server_route';
import { checkAccess } from '../../../../lib/streams/stream_crud';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import type { StreamDescriptionEvent } from './types';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';
import { createConnectorSSEError } from '../../../utils/create_connector_sse_error';

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
    logger,
  }): Promise<StorageClientDeleteResponse> => {
    const { featureClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { name, featureName, featureType } = params.path;

    const { read } = await checkAccess({ name, scopedClusterClient });

    if (!read) {
      throw new SecurityError(`Cannot delete feature for stream ${name}, insufficient privileges`);
    }

    logger
      .get('feature_identification')
      .debug(`Deleting feature ${featureType}/${featureName} for stream ${name}`);
    return await featureClient.deleteFeature(name, { type: featureType, name: featureName });
  },
});

export const upsertFeatureRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/{name}/features/{featureType}/{featureName}',
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
    path: z.object({ name: z.string(), featureType: featureTypeSchema, featureName: z.string() }),
    body: featureSchema,
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

    if (body.type !== featureType || body.name !== featureName) {
      throw new StatusError(`Feature type and name must match the path parameters`, 400);
    }

    const { read } = await checkAccess({ name, scopedClusterClient });

    if (!read) {
      throw new SecurityError(`Cannot update features for stream ${name}, insufficient privileges`);
    }

    return await featureClient.updateFeature(name, body);
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
    logger,
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

    const { read } = await checkAccess({ name, scopedClusterClient });

    if (!read) {
      throw new SecurityError(`Cannot update features for stream ${name}, insufficient privileges`);
    }

    logger
      .get('feature_identification')
      .debug(
        `Performing bulk feature operation with ${operations.length} operations for stream ${name}`
      );
    return await featureClient.bulk(name, operations);
  },
});

export type FeatureIdentificationTaskResult =
  | {
      status: 'not_started' | 'in_progress' | 'stale' | 'being_canceled' | 'canceled';
    }
  | {
      status: 'failed';
      error: string;
    }
  | ({
      status: 'completed';
    } & IdentifyFeaturesResult)
  | ({
      status: 'acknowledged';
    } & IdentifyFeaturesResult);

export const identifyFeaturesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/features/_identify',
  options: {
    access: 'internal',
    summary: 'Identify features in a stream',
    description: 'Identify features in a stream with an LLM',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
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
      schedule: BooleanFromString.optional(),
      cancel: BooleanFromString.optional(),
      acknowledge: BooleanFromString.optional(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<FeatureIdentificationTaskResult> => {
    const { scopedClusterClient, licensing, uiSettingsClient, taskClient } = await getScopedClients(
      {
        request,
      }
    );

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { name },
      query: { connectorId: connectorIdParam, from: start, to: end },
    } = params;

    const { read } = await checkAccess({ name, scopedClusterClient });

    if (!read) {
      throw new SecurityError(`Cannot update features for stream ${name}, insufficient privileges`);
    }

    const connectorId = await resolveConnectorId({
      connectorId: connectorIdParam,
      uiSettingsClient,
      logger,
    });

    if (params.query.schedule) {
      try {
        await taskClient.schedule<FeatureIdentificationTaskParams>({
          task: {
            type: 'streams_feature_identification',
            id: `streams_feature_identification_${name}`,
            space: '*',
            stream: name,
          },
          params: {
            connectorId,
            start: start.getTime(),
            end: end.getTime(),
          },
          request,
        });

        return {
          status: 'in_progress',
        };
      } catch (error) {
        if (error instanceof CancellationInProgressError) {
          throw conflict(error.message);
        }

        throw error;
      }
    } else if (params.query.cancel) {
      await taskClient.cancel(`streams_feature_identification_${name}`);

      return {
        status: 'being_canceled',
      };
    } else if (params.query.acknowledge) {
      try {
        const task = await taskClient.acknowledge<
          FeatureIdentificationTaskParams,
          IdentifyFeaturesResult
        >(`streams_feature_identification_${name}`);

        return {
          status: 'acknowledged',
          ...task.task.payload,
        };
      } catch (error) {
        if (error instanceof AcknowledgingIncompleteError) {
          throw conflict(error.message);
        }

        throw error;
      }
    }

    const task = await taskClient.get<FeatureIdentificationTaskParams, IdentifyFeaturesResult>(
      `streams_feature_identification_${name}`
    );

    if (task.status === 'in_progress') {
      if (isStale(task.created_at)) {
        return {
          status: 'stale',
        };
      }

      return {
        status: 'in_progress',
      };
    } else if (task.status === 'failed') {
      return {
        status: 'failed',
        error: task.task.error,
      };
    } else if (task.status === 'completed' || task.status === 'acknowledged') {
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
  }): Promise<Observable<StreamDescriptionEvent>> => {
    const {
      scopedClusterClient,
      licensing,
      uiSettingsClient,
      streamsClient,
      inferenceClient,
      soClient,
    } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { name },
      query: { connectorId: connectorIdParam, from: start, to: end },
    } = params;

    const { read } = await checkAccess({ name, scopedClusterClient });

    if (!read) {
      throw new SecurityError(
        `Cannot generate stream description for ${name}, insufficient privileges`
      );
    }

    const connectorId = await resolveConnectorId({
      connectorId: connectorIdParam,
      uiSettingsClient,
      logger,
    });

    // Get connector info for error enrichment
    const connector = await inferenceClient.getConnectorById(connectorId);

    const stream = await streamsClient.getStream(name);

    const promptsConfigService = new PromptsConfigService({
      soClient,
      logger,
    });

    const { descriptionPromptOverride } = await promptsConfigService.getPrompt();

    return from(
      generateStreamDescription({
        stream,
        esClient: scopedClusterClient.asCurrentUser,
        inferenceClient: inferenceClient.bindTo({ connectorId }),
        start: start.valueOf(),
        end: end.valueOf(),
        signal: getRequestAbortSignal(request),
        logger: logger.get('stream_description'),
        systemPromptOverride: descriptionPromptOverride,
      })
    ).pipe(
      map((result) => {
        return {
          type: 'stream_description' as const,
          description: result.description,
          tokensUsed: sumTokens(
            {
              prompt: 0,
              completion: 0,
              total: 0,
              cached: 0,
            },
            result.tokensUsed
          ),
        };
      }),
      catchError((error: Error) => {
        throw createConnectorSSEError(error, connector);
      })
    );
  },
});

export const featureRoutes = {
  ...getFeatureRoute,
  ...deleteFeatureRoute,
  ...upsertFeatureRoute,
  ...listFeaturesRoute,
  ...bulkFeaturesRoute,
  ...identifyFeaturesRoute,
  ...describeStreamRoute,
};
