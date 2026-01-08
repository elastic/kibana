/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { streamObjectNameSchema, systemSchema, type System } from '@kbn/streams-schema';
import type {
  StorageClientBulkResponse,
  StorageClientDeleteResponse,
  StorageClientIndexResponse,
} from '@kbn/storage-adapter';
import type { Observable } from 'rxjs';
import { catchError, from, map } from 'rxjs';
import { BooleanFromString } from '@kbn/zod-helpers';
import { conflict } from '@hapi/boom';
import { generateStreamDescription, type IdentifySystemsResult, sumTokens } from '@kbn/streams-ai';
import { AcknowledgingIncompleteError } from '../../../../lib/tasks/acknowledging_incomplete_error';
import { CancellationInProgressError } from '../../../../lib/tasks/cancellation_in_progress_error';
import { isStale } from '../../../../lib/tasks/is_stale';
import { PromptsConfigService } from '../../../../lib/saved_objects/significant_events/prompts_config_service';
import type { SystemIdentificationTaskParams } from '../../../../lib/tasks/task_definitions/system_identification';
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

export const getSystemRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/systems/{systemName}',
  options: {
    access: 'internal',
    summary: 'Get a system for a stream',
    description: 'Fetches the specified system',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
      systemName: streamObjectNameSchema,
    }),
  }),
  handler: async ({ params, request, getScopedClients, server }): Promise<{ system: System }> => {
    const { systemClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { name, systemName } = params.path;
    const { read } = await checkAccess({ name, scopedClusterClient });

    if (!read) {
      throw new SecurityError(`Cannot read stream ${name}, insufficient privileges`);
    }

    const system = await systemClient.getSystem(name, systemName);
    return { system };
  },
});

export const deleteSystemRoute = createServerRoute({
  endpoint: 'DELETE /internal/streams/{name}/systems/{systemName}',
  options: {
    access: 'internal',
    summary: 'Delete a system for a stream',
    description: 'Deletes the specified system',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
      systemName: streamObjectNameSchema,
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<StorageClientDeleteResponse> => {
    const { systemClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { name, systemName } = params.path;
    const { read } = await checkAccess({ name, scopedClusterClient });

    if (!read) {
      throw new SecurityError(`Cannot delete system for stream ${name}, insufficient privileges`);
    }

    logger.get('system_identification').debug(`Deleting system ${systemName} for stream ${name}`);
    return await systemClient.deleteSystem(name, systemName);
  },
});

export const upsertSystemRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/{name}/systems/{systemName}',
  options: {
    access: 'internal',
    summary: 'Upserts a system for a stream',
    description: 'Upserts the specified system',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ name: z.string(), systemName: streamObjectNameSchema }),
    body: systemSchema,
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<StorageClientIndexResponse> => {
    const { systemClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { name, systemName },
      body,
    } = params;

    if (body.name !== systemName) {
      throw new StatusError(`Cannot update system name`, 400);
    }

    const { read } = await checkAccess({ name, scopedClusterClient });
    if (!read) {
      throw new SecurityError(`Cannot update system for stream ${name}, insufficient privileges`);
    }

    return await systemClient.updateSystem(name, body);
  },
});

export const listSystemsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/systems',
  options: {
    access: 'internal',
    summary: 'Lists all systems for a stream',
    description: 'Fetches all systems for the specified stream',
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
  }): Promise<{ systems: System[] }> => {
    const { systemClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { name } = params.path;
    const { read } = await checkAccess({ name, scopedClusterClient });
    if (!read) {
      throw new SecurityError(`Cannot read stream ${name}, insufficient privileges`);
    }

    const { systems } = await systemClient.getSystems(name);
    return { systems };
  },
});

export const bulkSystemsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/systems/_bulk',
  options: {
    access: 'internal',
    summary: 'Bulk changes to systems',
    description: 'Add or delete systems in bulk for a given stream',
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
              system: systemSchema,
            }),
          }),
          z.object({
            delete: z.object({
              system: z.object({
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
    const { systemClient, scopedClusterClient, licensing, uiSettingsClient } =
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
      throw new SecurityError(`Cannot update systems for stream ${name}, insufficient privileges`);
    }

    logger
      .get('system_identification')
      .debug(
        `Performing bulk system operation with ${operations.length} operations for stream ${name}`
      );
    return await systemClient.bulk(name, operations);
  },
});

export type SystemIdentificationTaskResult =
  | {
      status: 'not_started' | 'in_progress' | 'stale' | 'being_canceled' | 'canceled';
    }
  | {
      status: 'failed';
      error: string;
    }
  | ({
      status: 'completed';
    } & IdentifySystemsResult)
  | ({
      status: 'acknowledged';
    } & IdentifySystemsResult);

export const identifySystemsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/systems/_identify',
  options: {
    access: 'internal',
    summary: 'Identify systems in a stream',
    description: 'Identify systems in a stream with an LLM',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
    query: z.object({
      connectorId: z.string().optional(),
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
  }): Promise<SystemIdentificationTaskResult> => {
    const { scopedClusterClient, licensing, uiSettingsClient, taskClient } = await getScopedClients(
      {
        request,
      }
    );

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { name },
      query: { from: start, to: end },
    } = params;

    const { read } = await checkAccess({ name, scopedClusterClient });
    if (!read) {
      throw new SecurityError(`Cannot update systems for stream ${name}, insufficient privileges`);
    }

    const connectorId = await resolveConnectorId({
      connectorId: params.query.connectorId,
      uiSettingsClient,
      logger,
    });

    if (params.query.schedule) {
      try {
        await taskClient.schedule<SystemIdentificationTaskParams>({
          task: {
            type: 'streams_system_identification',
            id: `streams_system_identification_${name}`,
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
      await taskClient.cancel(`streams_system_identification_${name}`);

      return {
        status: 'being_canceled',
      };
    } else if (params.query.acknowledge) {
      try {
        const task = await taskClient.acknowledge<
          SystemIdentificationTaskParams,
          IdentifySystemsResult
        >(`streams_system_identification_${name}`);

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

    const task = await taskClient.get<SystemIdentificationTaskParams, IdentifySystemsResult>(
      `streams_system_identification_${name}`
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

    const { descriptionPromptOverride } = await new PromptsConfigService({
      soClient,
      logger,
    }).getPrompt();

    return from(
      generateStreamDescription({
        stream,
        esClient: scopedClusterClient.asCurrentUser,
        inferenceClient: inferenceClient.bindTo({ connectorId }),
        start: start.valueOf(),
        end: end.valueOf(),
        signal: getRequestAbortSignal(request),
        logger: logger.get('stream_description'),
        systemPrompt: descriptionPromptOverride,
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

export const systemRoutes = {
  ...getSystemRoute,
  ...deleteSystemRoute,
  ...upsertSystemRoute,
  ...listSystemsRoute,
  ...bulkSystemsRoute,
  ...identifySystemsRoute,
  ...describeStreamRoute,
};
