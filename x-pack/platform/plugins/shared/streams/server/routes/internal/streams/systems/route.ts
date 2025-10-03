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
import { conditionSchema } from '@kbn/streamlang';
import { generateStreamDescription } from '@kbn/streams-ai';
import type { Observable } from 'rxjs';
import { from, map } from 'rxjs';
import { createServerRoute } from '../../../create_server_route';
import { checkAccess } from '../../../../lib/streams/stream_crud';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { runSystemIdentification } from '../../../../lib/streams/system/run_system_identification';
import type { IdentifiedSystemsEvent, StreamDescriptionEvent } from './types';

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
    path: z.object({ name: z.string(), systemName: streamObjectNameSchema }),
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
    path: z.object({ name: z.string(), systemName: streamObjectNameSchema }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<StorageClientDeleteResponse> => {
    const { systemClient, scopedClusterClient, licensing, uiSettingsClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { name, systemName } = params.path;

    const { write } = await checkAccess({ name, scopedClusterClient });

    if (!write) {
      throw new SecurityError(`Cannot delete system for stream ${name}, insufficient privileges`);
    }

    return await systemClient.deleteSystem(name, systemName);
  },
});

export const updateSystemRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/{name}/systems/{systemName}',
  options: {
    access: 'internal',
    summary: 'Updates a system for a stream',
    description: 'Updates the specified system',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ name: z.string(), systemName: streamObjectNameSchema }),
    body: z.object({
      description: z.string(),
      filter: conditionSchema,
    }),
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
      body: { description, filter },
    } = params;

    const { write } = await checkAccess({ name, scopedClusterClient });

    if (!write) {
      throw new SecurityError(`Cannot update systems for stream ${name}, insufficient privileges`);
    }

    return await systemClient.updateSystem(name, {
      name: systemName,
      description,
      filter,
    });
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

    const { hits: systems } = await systemClient.getSystems(name);

    return {
      systems,
    };
  },
});

export const bulkSystemsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/systems/_bulk',
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

    const { write } = await checkAccess({ name, scopedClusterClient });

    if (!write) {
      throw new SecurityError(`Cannot update systems for stream ${name}, insufficient privileges`);
    }

    return await systemClient.bulk(name, operations);
  },
});

export const identifySystemsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/systems/_identify',
  options: {
    access: 'internal',
    summary: 'Identify systems in a stream',
    description: 'Identify systems in a stream with an LLM',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
    query: z.object({
      connectorId: z.string(),
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
  }): Promise<IdentifiedSystemsEvent> => {
    const {
      systemClient,
      scopedClusterClient,
      licensing,
      uiSettingsClient,
      streamsClient,
      inferenceClient,
    } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { name },
      query: { connectorId, from: start, to: end },
    } = params;

    const { write } = await checkAccess({ name, scopedClusterClient });

    if (!write) {
      throw new SecurityError(`Cannot update systems for stream ${name}, insufficient privileges`);
    }

    const [{ hits }, stream] = await Promise.all([
      systemClient.getSystems(name),
      streamsClient.getStream(name),
    ]);

    const { systems } = await runSystemIdentification({
      start: start.getTime(),
      end: end.getTime(),
      esClient: scopedClusterClient.asCurrentUser,
      inferenceClient: inferenceClient.bindTo({ connectorId }),
      logger,
      stream,
      systems: hits,
    });

    return {
      type: 'identified_systems',
      systems,
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
      connectorId: z.string(),
      from: dateFromString,
      to: dateFromString,
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<Observable<StreamDescriptionEvent>> => {
    const { scopedClusterClient, licensing, uiSettingsClient, streamsClient, inferenceClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { name },
      query: { connectorId, from: start, to: end },
    } = params;

    const { read } = await checkAccess({ name, scopedClusterClient });

    if (!read) {
      throw new SecurityError(
        `Cannot generate stream description for ${name}, insufficient privileges`
      );
    }

    const stream = await streamsClient.getStream(name);

    return from(
      generateStreamDescription({
        stream,
        esClient: scopedClusterClient.asCurrentUser,
        inferenceClient: inferenceClient.bindTo({ connectorId }),
        start: start.valueOf(),
        end: end.valueOf(),
      })
    ).pipe(
      map((description) => {
        return {
          type: 'stream_description',
          description,
        };
      })
    );
  },
});

export const systemRoutes = {
  ...getSystemRoute,
  ...deleteSystemRoute,
  ...updateSystemRoute,
  ...listSystemsRoute,
  ...bulkSystemsRoute,
  ...identifySystemsRoute,
  ...describeStreamRoute,
};
