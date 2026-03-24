/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import type {
  MemoryEntry,
  MemoryTreeNode,
  MemorySearchResult,
  MemoryVersionRecord,
  CompactionLogEntry,
} from '../../../lib/memory';
import { MemoryServiceImpl } from '../../../lib/memory';
import type { StreamsServer } from '../../../types';

const getMemoryService = (server: StreamsServer, logger: Logger) => {
  return new MemoryServiceImpl({
    logger,
    esClient: server.core.elasticsearch.client.asInternalUser,
  });
};

const createEntryRoute = createServerRoute({
  endpoint: 'POST /internal/streams/memory/entries',
  options: {
    access: 'internal',
    summary: 'Create a memory entry',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      path: z.string(),
      title: z.string(),
      content: z.string(),
      tags: z.array(z.string()).optional(),
    }),
  }),
  handler: async ({ params, request, server, logger }): Promise<MemoryEntry> => {
    const memory = getMemoryService(server, logger);
    const spaceId = DEFAULT_SPACE_ID;

    const authUser = server.core.security.authc.getCurrentUser(request);
    const user = authUser?.username ?? 'unknown';

    return memory.create({
      ...params.body,
      tags: params.body.tags ?? [],
      space: spaceId,
      user,
    });
  },
});

const getEntryRoute = createServerRoute({
  endpoint: 'GET /internal/streams/memory/entries/{id}',
  options: {
    access: 'internal',
    summary: 'Get a memory entry by ID',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ id: z.string() }),
  }),
  handler: async ({ params, request, server, logger }): Promise<MemoryEntry> => {
    const memory = getMemoryService(server, logger);
    const spaceId = DEFAULT_SPACE_ID;

    return memory.get({ id: params.path.id, space: spaceId });
  },
});

const getEntryByPathRoute = createServerRoute({
  endpoint: 'GET /internal/streams/memory/entries/by-path',
  options: {
    access: 'internal',
    summary: 'Get a memory entry by path',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: z.object({ path: z.string() }),
  }),
  handler: async ({ params, request, server, logger }): Promise<MemoryEntry> => {
    const memory = getMemoryService(server, logger);
    const spaceId = DEFAULT_SPACE_ID;

    const entry = await memory.getByPath({ path: params.query.path, space: spaceId });
    if (!entry) {
      throw new Error(`Entry not found at path: ${params.query.path}`);
    }
    return entry;
  },
});

const updateEntryRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/memory/entries/{id}',
  options: {
    access: 'internal',
    summary: 'Update a memory entry',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ id: z.string() }),
    body: z.object({
      title: z.string().optional(),
      content: z.string().optional(),
      tags: z.array(z.string()).optional(),
      path: z.string().optional(),
      change_summary: z.string().optional(),
    }),
  }),
  handler: async ({ params, request, server, logger }): Promise<MemoryEntry> => {
    const memory = getMemoryService(server, logger);
    const spaceId = DEFAULT_SPACE_ID;

    const authUser = server.core.security.authc.getCurrentUser(request);
    const user = authUser?.username ?? 'unknown';

    return memory.update({
      id: params.path.id,
      ...params.body,
      changeSummary: params.body.change_summary,
      space: spaceId,
      user,
    });
  },
});

const deleteEntryRoute = createServerRoute({
  endpoint: 'DELETE /internal/streams/memory/entries/{id}',
  options: {
    access: 'internal',
    summary: 'Delete a memory entry',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ id: z.string() }),
  }),
  handler: async ({ params, request, server, logger }): Promise<{ deleted: boolean }> => {
    const memory = getMemoryService(server, logger);
    const spaceId = DEFAULT_SPACE_ID;

    const authUser = server.core.security.authc.getCurrentUser(request);
    const user = authUser?.username ?? 'unknown';

    await memory.delete({ id: params.path.id, space: spaceId, user });
    return { deleted: true };
  },
});

const moveEntryRoute = createServerRoute({
  endpoint: 'POST /internal/streams/memory/entries/{id}/move',
  options: {
    access: 'internal',
    summary: 'Move a memory entry to a new path',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ id: z.string() }),
    body: z.object({ new_path: z.string() }),
  }),
  handler: async ({ params, request, server, logger }): Promise<MemoryEntry> => {
    const memory = getMemoryService(server, logger);
    const spaceId = DEFAULT_SPACE_ID;

    const authUser = server.core.security.authc.getCurrentUser(request);
    const user = authUser?.username ?? 'unknown';

    return memory.move({
      id: params.path.id,
      newPath: params.body.new_path,
      space: spaceId,
      user,
    });
  },
});

const searchRoute = createServerRoute({
  endpoint: 'POST /internal/streams/memory/search',
  options: {
    access: 'internal',
    summary: 'Search memory entries',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    body: z.object({
      query: z.string(),
      tags: z.array(z.string()).optional(),
      parent_path: z.string().optional(),
      size: z.number().min(1).max(50).optional(),
    }),
  }),
  handler: async ({
    params,
    request,
    server,
    logger,
  }): Promise<{ results: MemorySearchResult[] }> => {
    const memory = getMemoryService(server, logger);
    const spaceId = DEFAULT_SPACE_ID;

    const results = await memory.search({
      query: params.body.query,
      tags: params.body.tags,
      parentPath: params.body.parent_path,
      size: params.body.size,
      space: spaceId,
    });
    return { results };
  },
});

const getTreeRoute = createServerRoute({
  endpoint: 'GET /internal/streams/memory/tree',
  options: {
    access: 'internal',
    summary: 'Get memory tree hierarchy',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({}),
  handler: async ({ request, server, logger }): Promise<{ tree: MemoryTreeNode[] }> => {
    const memory = getMemoryService(server, logger);
    const spaceId = DEFAULT_SPACE_ID;

    const tree = await memory.getTree({ space: spaceId });
    return { tree };
  },
});

const getHistoryRoute = createServerRoute({
  endpoint: 'GET /internal/streams/memory/entries/{id}/history',
  options: {
    access: 'internal',
    summary: 'Get version history for a memory entry',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ id: z.string() }),
    query: z.object({
      size: z.coerce.number().min(1).max(100).optional(),
    }),
  }),
  handler: async ({
    params,
    request,
    server,
    logger,
  }): Promise<{ history: MemoryVersionRecord[] }> => {
    const memory = getMemoryService(server, logger);
    const spaceId = DEFAULT_SPACE_ID;

    const history = await memory.getHistory({
      entryId: params.path.id,
      space: spaceId,
      size: params.query.size,
    });
    return { history };
  },
});

const getVersionRoute = createServerRoute({
  endpoint: 'GET /internal/streams/memory/entries/{id}/history/{version}',
  options: {
    access: 'internal',
    summary: 'Get a specific version of a memory entry',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string(),
      version: z.coerce.number(),
    }),
  }),
  handler: async ({ params, request, server, logger }): Promise<MemoryVersionRecord> => {
    const memory = getMemoryService(server, logger);
    const spaceId = DEFAULT_SPACE_ID;

    return memory.getVersion({
      entryId: params.path.id,
      version: params.path.version,
      space: spaceId,
    });
  },
});

const rollbackRoute = createServerRoute({
  endpoint: 'POST /internal/streams/memory/entries/{id}/rollback',
  options: {
    access: 'internal',
    summary: 'Rollback a memory entry to a specific version',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ id: z.string() }),
    body: z.object({ version: z.number() }),
  }),
  handler: async ({ params, request, server, logger }): Promise<MemoryEntry> => {
    const memory = getMemoryService(server, logger);
    const spaceId = DEFAULT_SPACE_ID;

    const authUser = server.core.security.authc.getCurrentUser(request);
    const user = authUser?.username ?? 'unknown';

    return memory.rollback({
      entryId: params.path.id,
      version: params.body.version,
      space: spaceId,
      user,
    });
  },
});

const compactionLogRoute = createServerRoute({
  endpoint: 'GET /internal/streams/memory/compaction-log',
  options: {
    access: 'internal',
    summary: 'Get memory compaction log',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: z.object({
      size: z.coerce.number().min(1).max(100).optional(),
    }),
  }),
  handler: async ({ params, request, server, logger }): Promise<{ log: CompactionLogEntry[] }> => {
    const memory = getMemoryService(server, logger);
    const spaceId = DEFAULT_SPACE_ID;

    const log = await memory.getCompactionLog({
      space: spaceId,
      size: params.query.size,
    });
    return { log };
  },
});

export const internalMemoryRoutes = {
  ...createEntryRoute,
  ...getEntryRoute,
  ...getEntryByPathRoute,
  ...updateEntryRoute,
  ...deleteEntryRoute,
  ...moveEntryRoute,
  ...searchRoute,
  ...getTreeRoute,
  ...getHistoryRoute,
  ...getVersionRoute,
  ...rollbackRoute,
  ...compactionLogRoute,
};
