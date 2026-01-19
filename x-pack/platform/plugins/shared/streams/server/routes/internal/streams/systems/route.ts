/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { System } from '@kbn/streams-schema';
import { streamObjectNameSchema, systemSchema } from '@kbn/streams-schema';
import type {
  StorageClientBulkResponse,
  StorageClientDeleteResponse,
  StorageClientIndexResponse,
} from '@kbn/storage-adapter';
import { type IdentifySystemsResult } from '@kbn/streams-ai';
import type { TaskResult } from '../../../../lib/tasks/types';
import { handleTaskAction } from '../../../utils/task_helpers';
import {
  SYSTEMS_IDENTIFICATION_TASK_TYPE,
  getSystemsIdentificationTaskId,
  type SystemIdentificationTaskParams,
} from '../../../../lib/tasks/task_definitions/system_identification';
import { resolveConnectorId } from '../../../utils/resolve_connector_id';
import { StatusError } from '../../../../lib/streams/errors/status_error';
import { createServerRoute } from '../../../create_server_route';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';

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
    const { systemClient, streamsClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { name, systemName } = params.path;
    await streamsClient.ensureStream(name);

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
    const { systemClient, streamsClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { name, systemName } = params.path;
    await streamsClient.ensureStream(name);

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
    const { systemClient, streamsClient, licensing, uiSettingsClient } = await getScopedClients({
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

    await streamsClient.ensureStream(name);

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
    const { systemClient, streamsClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { name } = params.path;
    await streamsClient.ensureStream(name);

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
    const { systemClient, streamsClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { name },
      body: { operations },
    } = params;

    await streamsClient.ensureStream(name);

    logger
      .get('system_identification')
      .debug(
        `Performing bulk system operation with ${operations.length} operations for stream ${name}`
      );
    return await systemClient.bulk(name, operations);
  },
});

export type SystemIdentificationTaskResult = TaskResult<Pick<IdentifySystemsResult, 'systems'>>;

export const systemsStatusRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/systems/_status',
  options: {
    access: 'internal',
    summary: 'Check the status of system identification',
    description:
      'System identification happens as a background task, this endpoints allows the user to check the status of this task. This endpoints combine with POST /internal/streams/{name}/systems/_task which manages the task lifecycle.',
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
  }): Promise<SystemIdentificationTaskResult> => {
    const { streamsClient, licensing, uiSettingsClient, taskClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { name },
    } = params;

    await streamsClient.ensureStream(name);

    return taskClient.getStatus<
      SystemIdentificationTaskParams,
      Pick<IdentifySystemsResult, 'systems'>
    >(getSystemsIdentificationTaskId(name));
  },
});

export const systemsTaskRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/systems/_task',
  options: {
    access: 'internal',
    summary: 'Identify systems in a stream',
    description:
      'Identify systems in a stream with an LLM, this happens as a background task and this endpoint manages the task lifecycle.',
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
  }): Promise<SystemIdentificationTaskResult> => {
    const { streamsClient, licensing, uiSettingsClient, taskClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { name },
      body,
    } = params;

    await streamsClient.ensureStream(name);

    const taskId = getSystemsIdentificationTaskId(name);

    const actionParams =
      body.action === 'schedule'
        ? ({
            action: body.action,
            scheduleConfig: {
              taskType: SYSTEMS_IDENTIFICATION_TASK_TYPE,
              taskId,
              streamName: name,
              params: await (async (): Promise<SystemIdentificationTaskParams> => {
                const connectorId = await resolveConnectorId({
                  connectorId: body.connectorId,
                  uiSettingsClient,
                  logger,
                });
                return {
                  connectorId,
                  start: body.from.getTime(),
                  end: body.to.getTime(),
                };
              })(),
              request,
            },
          } as const)
        : ({ action: body.action } as const);

    return handleTaskAction<SystemIdentificationTaskParams, Pick<IdentifySystemsResult, 'systems'>>(
      {
        taskClient,
        taskId,
        ...actionParams,
      }
    );
  },
});

export const systemRoutes = {
  ...getSystemRoute,
  ...deleteSystemRoute,
  ...upsertSystemRoute,
  ...listSystemsRoute,
  ...bulkSystemsRoute,
  ...systemsStatusRoute,
  ...systemsTaskRoute,
};
