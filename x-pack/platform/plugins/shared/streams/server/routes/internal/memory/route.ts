/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ElasticsearchClient, IUiSettingsClient, Logger } from '@kbn/core/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { TaskResult } from '@kbn/streams-schema';
import { featureSchema, generatedSignificantEventQuerySchema } from '@kbn/streams-schema';
import { notFound } from '@hapi/boom';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import type {
  MemoryEntry,
  MemoryCategoryNode,
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
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import {
  MEMORY_GENERATION_TASK_TYPE,
  type MemoryGenerationTaskParams,
} from '../../../lib/tasks/task_definitions/memory_generation';
import { isSignificantEventsMemoryEnabled } from '../../../lib/memory/is_significant_events_memory_enabled';
import { FeatureNotEnabledError } from '../../../lib/streams/errors/feature_not_enabled_error';

const assertMemoryEnabled = async ({
  server,
  licensing,
  uiSettingsClient,
}: {
  server: StreamsServer;
  licensing: LicensingPluginStart;
  uiSettingsClient: IUiSettingsClient;
}) => {
  await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

  const useMemory = await isSignificantEventsMemoryEnabled(server.core.featureFlags);
  if (!useMemory) {
    throw new FeatureNotEnabledError(
      'Memory is disabled. Enable the streams.significantEventsMemoryEnabled feature flag.'
    );
  }
};

const createMemoryService = (esClient: ElasticsearchClient, logger: Logger) =>
  new MemoryServiceImpl({ logger, esClient });

const createEntryRoute = createServerRoute({
  endpoint: 'POST /internal/streams/memory/entries',
  options: {
    access: 'internal',
    summary: 'Create a memory page',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      name: z.string(),
      title: z.string(),
      content: z.string(),
      categories: z.array(z.string()).optional(),
      references: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
    }),
  }),
  handler: async ({ params, request, server, logger, getScopedClients }): Promise<MemoryEntry> => {
    const { licensing, uiSettingsClient, scopedClusterClient } = await getScopedClients({
      request,
    });
    await assertMemoryEnabled({ server, licensing, uiSettingsClient });
    const memory = createMemoryService(scopedClusterClient.asCurrentUser, logger);

    const authUser = server.core.security.authc.getCurrentUser(request);
    const user = authUser?.username ?? 'unknown';

    return memory.create({
      ...params.body,
      categories: params.body.categories ?? [],
      references: params.body.references ?? [],
      tags: params.body.tags ?? [],
      user,
    });
  },
});

const getEntryRoute = createServerRoute({
  endpoint: 'GET /internal/streams/memory/entries/{id}',
  options: {
    access: 'internal',
    summary: 'Get a memory page by ID',
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
    const { licensing, uiSettingsClient, scopedClusterClient } = await getScopedClients({
      request,
    });
    await assertMemoryEnabled({ server, licensing, uiSettingsClient });
    const memory = createMemoryService(scopedClusterClient.asCurrentUser, logger);

    return memory.get({ id: params.path.id });
  },
});

const getEntryByNameRoute = createServerRoute({
  endpoint: 'GET /internal/streams/memory/entries/by-name',
  options: {
    access: 'internal',
    summary: 'Get a memory page by name',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: z.object({ name: z.string() }),
  }),
  handler: async ({ params, request, server, logger, getScopedClients }): Promise<MemoryEntry> => {
    const { licensing, uiSettingsClient, scopedClusterClient } = await getScopedClients({
      request,
    });
    await assertMemoryEnabled({ server, licensing, uiSettingsClient });
    const memory = createMemoryService(scopedClusterClient.asCurrentUser, logger);

    const entry = await memory.getByName({ name: params.query.name });
    if (!entry) {
      throw notFound(`Page not found with name: ${params.query.name}`);
    }
    return entry;
  },
});

const updateEntryRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/memory/entries/{id}',
  options: {
    access: 'internal',
    summary: 'Update a memory page',
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
      name: z.string().optional(),
      categories: z.array(z.string()).optional(),
      references: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      change_summary: z.string().optional(),
    }),
  }),
  handler: async ({ params, request, server, logger, getScopedClients }): Promise<MemoryEntry> => {
    const { licensing, uiSettingsClient, scopedClusterClient } = await getScopedClients({
      request,
    });
    await assertMemoryEnabled({ server, licensing, uiSettingsClient });
    const memory = createMemoryService(scopedClusterClient.asCurrentUser, logger);

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
    summary: 'Delete a memory page',
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
    const { licensing, uiSettingsClient, scopedClusterClient } = await getScopedClients({
      request,
    });
    await assertMemoryEnabled({ server, licensing, uiSettingsClient });
    const memory = createMemoryService(scopedClusterClient.asCurrentUser, logger);

    const authUser = server.core.security.authc.getCurrentUser(request);
    const user = authUser?.username ?? 'unknown';

    await memory.delete({ id: params.path.id, user });
    return { deleted: true };
  },
});

const renameEntryRoute = createServerRoute({
  endpoint: 'POST /internal/streams/memory/entries/{id}/rename',
  options: {
    access: 'internal',
    summary: 'Rename a memory page',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ id: z.string() }),
    body: z.object({ new_name: z.string() }),
  }),
  handler: async ({ params, request, server, logger, getScopedClients }): Promise<MemoryEntry> => {
    const { licensing, uiSettingsClient, scopedClusterClient } = await getScopedClients({
      request,
    });
    await assertMemoryEnabled({ server, licensing, uiSettingsClient });
    const memory = createMemoryService(scopedClusterClient.asCurrentUser, logger);

    const authUser = server.core.security.authc.getCurrentUser(request);
    const user = authUser?.username ?? 'unknown';

    return memory.rename({
      id: params.path.id,
      newName: params.body.new_name,
      user,
    });
  },
});

const searchRoute = createServerRoute({
  endpoint: 'POST /internal/streams/memory/search',
  options: {
    access: 'internal',
    summary: 'Search memory pages',
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
      categories: z.array(z.string()).optional(),
      references: z.array(z.string()).optional(),
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
    const { licensing, uiSettingsClient, scopedClusterClient } = await getScopedClients({
      request,
    });
    await assertMemoryEnabled({ server, licensing, uiSettingsClient });
    const memory = createMemoryService(scopedClusterClient.asCurrentUser, logger);

    const results = await memory.search({
      query: params.body.query,
      tags: params.body.tags,
      categories: params.body.categories,
      references: params.body.references,
      size: params.body.size,
    });
    return { results };
  },
});

const getCategoryTreeRoute = createServerRoute({
  endpoint: 'GET /internal/streams/memory/categories',
  options: {
    access: 'internal',
    summary: 'Get memory category tree',
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
  }): Promise<{ tree: MemoryCategoryNode[] }> => {
    const { licensing, uiSettingsClient, scopedClusterClient } = await getScopedClients({
      request,
    });
    await assertMemoryEnabled({ server, licensing, uiSettingsClient });
    const memory = createMemoryService(scopedClusterClient.asCurrentUser, logger);

    const tree = await memory.getCategoryTree();
    return { tree };
  },
});

const getHistoryRoute = createServerRoute({
  endpoint: 'GET /internal/streams/memory/entries/{id}/history',
  options: {
    access: 'internal',
    summary: 'Get version history for a memory page',
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
    const { licensing, uiSettingsClient, scopedClusterClient } = await getScopedClients({
      request,
    });
    await assertMemoryEnabled({ server, licensing, uiSettingsClient });
    const memory = createMemoryService(scopedClusterClient.asCurrentUser, logger);

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
    summary: 'Get a specific version of a memory page',
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
    const { licensing, uiSettingsClient, scopedClusterClient } = await getScopedClients({
      request,
    });
    await assertMemoryEnabled({ server, licensing, uiSettingsClient });
    const memory = createMemoryService(scopedClusterClient.asCurrentUser, logger);

    return memory.getVersion({
      entryId: params.path.id,
      version: params.path.version,
    });
  },
});

const recentChangesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/memory/recent-changes',
  options: {
    access: 'internal',
    summary: 'Get recent changes across all memory pages',
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
    const { licensing, uiSettingsClient, scopedClusterClient } = await getScopedClients({
      request,
    });
    await assertMemoryEnabled({ server, licensing, uiSettingsClient });
    const memory = createMemoryService(scopedClusterClient.asCurrentUser, logger);

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
    server,
  }): Promise<TaskResult<ConversationScraperTaskResult>> => {
    const { taskClient, licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertMemoryEnabled({ server, licensing, uiSettingsClient });

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
    server,
  }): Promise<TaskResult<MemoryConsolidationTaskResult>> => {
    const { taskClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });
    await assertMemoryEnabled({ server, licensing, uiSettingsClient });

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

// Schedules a singleton memory generation task (same fixed task ID as the
// onboarding task uses). Concurrent calls replace rather than queue, which is
// fine because memory generation is idempotent and best-effort.
// TODO: Replace this endpoint with a managed workflow once memory generation
// is migrated to the workflow engine.
const generateMemoryRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{streamName}/memory/_generate',
  params: z.object({
    path: z.object({ streamName: z.string() }),
    body: z.object({
      features: z.array(featureSchema).optional(),
      queries: z.array(generatedSignificantEventQuerySchema).optional(),
    }),
  }),
  options: {
    access: 'internal',
    summary: 'Generate memory from discovery indicators',
    description:
      'Schedules a background task to synthesize features and queries into memory pages.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ acknowledged: boolean; skipped?: boolean; reason?: string }> => {
    const { uiSettingsClient, licensing, taskClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const memoryEnabled = await isSignificantEventsMemoryEnabled(server.core.featureFlags);
    if (!memoryEnabled) {
      return {
        acknowledged: false,
        skipped: true,
        reason: 'memory_disabled',
      };
    }

    const { streamName } = params.path;
    const { features: rawFeatures, queries: rawQueries } = params.body;

    const features = rawFeatures?.filter((f) => f.stream_name === streamName);
    const queries = rawQueries?.map((query) => ({ streamName, query }));

    await taskClient.schedule<MemoryGenerationTaskParams>({
      task: {
        type: MEMORY_GENERATION_TASK_TYPE,
        id: MEMORY_GENERATION_TASK_TYPE,
        space: '*',
      },
      params: { features, queries },
      request,
    });

    return { acknowledged: true };
  },
});

export const internalMemoryRoutes = {
  ...createEntryRoute,
  ...getEntryRoute,
  ...getEntryByNameRoute,
  ...updateEntryRoute,
  ...deleteEntryRoute,
  ...renameEntryRoute,
  ...searchRoute,
  ...getCategoryTreeRoute,
  ...getHistoryRoute,
  ...getVersionRoute,
  ...recentChangesRoute,
  ...scrapeConversationsRoute,
  ...consolidateMemoryRoute,
  ...generateMemoryRoute,
};
