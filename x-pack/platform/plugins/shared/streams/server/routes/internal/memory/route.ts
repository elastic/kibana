/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { TaskResult } from '@kbn/streams-schema';
import type { GetScopedClients } from '../../types';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import type {
  MemoryEntry,
  MemoryTreeNode,
  MemorySearchResult,
  MemoryVersionRecord,
} from '../../../lib/memory';
import { MemoryServiceImpl } from '../../../lib/memory';
import type { StreamsServer } from '../../../types';
import { taskActionSchema } from '../../../lib/tasks/task_action_schema';
import { handleTaskAction } from '../../utils/task_helpers';
import {
  CONVERSATION_SCRAPER_TASK_TYPE,
  type ConversationScraperTaskParams,
  type ConversationScraperTaskResult,
} from '../../../lib/tasks/task_definitions/conversation_scraper';
import {
  MEMORY_CONSOLIDATION_TASK_TYPE,
  type MemoryConsolidationTaskParams,
  type MemoryConsolidationTaskResult,
} from '../../../lib/tasks/task_definitions/memory_consolidation';

const assertMemoryEnabled = async (getScopedClients: GetScopedClients, request: KibanaRequest) => {
  const { modelSettingsClient } = await getScopedClients({ request });
  const settings = await modelSettingsClient.getSettings();
  if (!settings.useMemory) {
    throw new Error('Memory is disabled. Enable useMemory in settings to use this feature.');
  }
};

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
  handler: async ({ params, request, server, logger, getScopedClients }): Promise<MemoryEntry> => {
    await assertMemoryEnabled(getScopedClients, request);
    const memory = getMemoryService(server, logger);

    const authUser = server.core.security.authc.getCurrentUser(request);
    const user = authUser?.username ?? 'unknown';

    return memory.create({
      ...params.body,
      tags: params.body.tags ?? [],
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
  handler: async ({ params, request, server, logger, getScopedClients }): Promise<MemoryEntry> => {
    await assertMemoryEnabled(getScopedClients, request);
    const memory = getMemoryService(server, logger);

    return memory.get({ id: params.path.id });
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
  handler: async ({ params, request, server, logger, getScopedClients }): Promise<MemoryEntry> => {
    await assertMemoryEnabled(getScopedClients, request);
    const memory = getMemoryService(server, logger);

    const entry = await memory.getByPath({ path: params.query.path });
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
  handler: async ({ params, request, server, logger, getScopedClients }): Promise<MemoryEntry> => {
    await assertMemoryEnabled(getScopedClients, request);
    const memory = getMemoryService(server, logger);

    const authUser = server.core.security.authc.getCurrentUser(request);
    const user = authUser?.username ?? 'unknown';

    return memory.update({
      id: params.path.id,
      ...params.body,
      changeSummary: params.body.change_summary,
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
  handler: async ({
    params,
    request,
    server,
    logger,
    getScopedClients,
  }): Promise<{ deleted: boolean }> => {
    await assertMemoryEnabled(getScopedClients, request);
    const memory = getMemoryService(server, logger);

    const authUser = server.core.security.authc.getCurrentUser(request);
    const user = authUser?.username ?? 'unknown';

    await memory.delete({ id: params.path.id, user });
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
  handler: async ({ params, request, server, logger, getScopedClients }): Promise<MemoryEntry> => {
    await assertMemoryEnabled(getScopedClients, request);
    const memory = getMemoryService(server, logger);

    const authUser = server.core.security.authc.getCurrentUser(request);
    const user = authUser?.username ?? 'unknown';

    return memory.move({
      id: params.path.id,
      newPath: params.body.new_path,
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
    getScopedClients,
  }): Promise<{ results: MemorySearchResult[] }> => {
    await assertMemoryEnabled(getScopedClients, request);
    const memory = getMemoryService(server, logger);

    const results = await memory.search({
      query: params.body.query,
      tags: params.body.tags,
      parentPath: params.body.parent_path,
      size: params.body.size,
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
  handler: async ({
    request,
    server,
    logger,
    getScopedClients,
  }): Promise<{ tree: MemoryTreeNode[] }> => {
    await assertMemoryEnabled(getScopedClients, request);
    const memory = getMemoryService(server, logger);

    const tree = await memory.getTree();
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
    query: z
      .object({
        size: z.coerce.number().min(1).max(100).optional(),
      })
      .optional()
      .default({}),
  }),
  handler: async ({
    params,
    request,
    server,
    logger,
    getScopedClients,
  }): Promise<{ history: MemoryVersionRecord[] }> => {
    await assertMemoryEnabled(getScopedClients, request);
    const memory = getMemoryService(server, logger);

    const history = await memory.getHistory({
      entryId: params.path.id,
      size: params.query?.size,
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
  handler: async ({
    params,
    request,
    server,
    logger,
    getScopedClients,
  }): Promise<MemoryVersionRecord> => {
    await assertMemoryEnabled(getScopedClients, request);
    const memory = getMemoryService(server, logger);

    return memory.getVersion({
      entryId: params.path.id,
      version: params.path.version,
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
  handler: async ({ params, request, server, logger, getScopedClients }): Promise<MemoryEntry> => {
    await assertMemoryEnabled(getScopedClients, request);
    const memory = getMemoryService(server, logger);

    const authUser = server.core.security.authc.getCurrentUser(request);
    const user = authUser?.username ?? 'unknown';

    return memory.rollback({
      entryId: params.path.id,
      version: params.body.version,
      user,
    });
  },
});

const recentChangesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/memory/recent-changes',
  options: {
    access: 'internal',
    summary: 'Get recent changes across all memory entries',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: z
      .object({
        size: z.coerce.number().min(1).max(100).optional(),
      })
      .optional()
      .default({}),
  }),
  handler: async ({
    params,
    request,
    server,
    logger,
    getScopedClients,
  }): Promise<{ changes: MemoryVersionRecord[] }> => {
    await assertMemoryEnabled(getScopedClients, request);
    const memory = getMemoryService(server, logger);

    const changes = await memory.getRecentChanges({
      size: params.query?.size,
    });
    return { changes };
  },
});

const SCRAPER_TASK_ID = 'streams_conversation_scraper_singleton';
const CONSOLIDATION_TASK_ID = 'streams_memory_consolidation_singleton';

const scrapeConversationsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/memory/_scrape_conversations',
  options: {
    access: 'internal',
    summary: 'Trigger conversation scraping for memory',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: taskActionSchema({}),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
  }): Promise<TaskResult<ConversationScraperTaskResult>> => {
    const { taskClient, modelSettingsClient } = await getScopedClients({ request });
    const settings = await modelSettingsClient.getSettings();
    if (!settings.useMemory) {
      throw new Error('Memory is disabled. Enable useMemory in settings to use this feature.');
    }

    const { body } = params;

    const actionParams =
      body.action === 'schedule'
        ? ({
            action: body.action,
            scheduleConfig: {
              taskType: CONVERSATION_SCRAPER_TASK_TYPE,
              taskId: SCRAPER_TASK_ID,
              params: {},
              request,
            },
          } as const)
        : ({ action: body.action } as const);

    return handleTaskAction<ConversationScraperTaskParams, ConversationScraperTaskResult>({
      taskClient,
      taskId: SCRAPER_TASK_ID,
      ...actionParams,
    });
  },
});

const consolidateMemoryRoute = createServerRoute({
  endpoint: 'POST /internal/streams/memory/_consolidate',
  options: {
    access: 'internal',
    summary: 'Trigger memory consolidation and cleanup',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: taskActionSchema({}),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
  }): Promise<TaskResult<MemoryConsolidationTaskResult>> => {
    const { taskClient, modelSettingsClient } = await getScopedClients({ request });
    const settings = await modelSettingsClient.getSettings();
    if (!settings.useMemory) {
      throw new Error('Memory is disabled. Enable useMemory in settings to use this feature.');
    }

    const { body } = params;

    const actionParams =
      body.action === 'schedule'
        ? ({
            action: body.action,
            scheduleConfig: {
              taskType: MEMORY_CONSOLIDATION_TASK_TYPE,
              taskId: CONSOLIDATION_TASK_ID,
              params: {},
              request,
            },
          } as const)
        : ({ action: body.action } as const);

    return handleTaskAction<MemoryConsolidationTaskParams, MemoryConsolidationTaskResult>({
      taskClient,
      taskId: CONSOLIDATION_TASK_ID,
      ...actionParams,
    });
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
  ...recentChangesRoute,
  ...scrapeConversationsRoute,
  ...consolidateMemoryRoute,
};
