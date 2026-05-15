/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { IUiSettingsClient } from '@kbn/core/server';
import { OBSERVABILITY_STREAMS_ENABLE_MEMORY } from '@kbn/management-settings-ids';
import { notFound } from '@hapi/boom';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import type { StoredMemoryPage } from '../../../lib/memory';

/**
 * UI-facing shape for a memory page (maps from append-only StoredMemoryPage).
 * Route signatures stay the same so the UI (MemoryTab / use_memory.ts) requires no changes.
 */
export interface MemoryEntry {
  id: string;
  name: string;
  title: string;
  content: string;
  categories: string[];
  references: string[];
  tags: string[];
  updated_at: string;
  written_by: string;
}

export interface MemoryCategoryNode {
  name: string;
  category: string;
  pages: Array<{ id: string; name: string; title: string }>;
  children: MemoryCategoryNode[];
}

export interface MemorySearchResult {
  id: string;
  name: string;
  title: string;
  snippet: string;
  categories: string[];
  tags: string[];
}

const toStringArray = (v: unknown): string[] => {
  if (Array.isArray(v)) return v as string[];
  if (v) return [v as string];
  return [];
};

const pageToEntry = (page: StoredMemoryPage): MemoryEntry => ({
  id: page.page_name as string,
  name: page.page_name as string,
  title: (page.title as string) ?? '',
  content: (page.content as string) ?? '',
  categories: toStringArray(page.categories),
  references: toStringArray(page.references),
  tags: toStringArray(page.tags),
  updated_at: (page['@timestamp'] as string) ?? new Date().toISOString(),
  written_by: (page.written_by as string) ?? 'unknown',
});

const buildCategoryTree = (entries: MemoryEntry[]): MemoryCategoryNode[] => {
  const nodeMap = new Map<string, MemoryCategoryNode>();

  const getOrCreate = (category: string): MemoryCategoryNode => {
    const existing = nodeMap.get(category);
    if (existing) return existing;
    const parts = category.split('/');
    const node: MemoryCategoryNode = {
      name: parts[parts.length - 1],
      category,
      pages: [],
      children: [],
    };
    nodeMap.set(category, node);
    if (parts.length > 1) {
      const parentCat = parts.slice(0, -1).join('/');
      getOrCreate(parentCat).children.push(node);
    }
    return node;
  };

  for (const entry of entries) {
    const cats = entry.categories.length > 0 ? entry.categories : ['uncategorized'];
    for (const cat of cats) {
      getOrCreate(cat).pages.push({ id: entry.id, name: entry.name, title: entry.title });
    }
  }

  return [...nodeMap.values()].filter((n) => !n.category.includes('/'));
};

const assertMemoryEnabled = async (uiSettingsClient: IUiSettingsClient) => {
  const useMemory = await uiSettingsClient.get<boolean>(OBSERVABILITY_STREAMS_ENABLE_MEMORY);
  if (!useMemory) {
    throw new Error(
      'Memory is disabled. Enable the Streams memory advanced setting (observability:streamsEnableMemory).'
    );
  }
};

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
  handler: async ({ params, request, server, getScopedClients }): Promise<MemoryEntry> => {
    const { uiSettingsClient, getMemoryClient } = await getScopedClients({ request });
    await assertMemoryEnabled(uiSettingsClient);

    const authUser = server.core.security.authc.getCurrentUser(request);
    const user = authUser?.username ?? 'unknown';

    const page: StoredMemoryPage = {
      '@timestamp': new Date().toISOString(),
      page_name: params.body.name,
      title: params.body.title,
      content: params.body.content,
      categories: params.body.categories ?? [],
      references: params.body.references ?? [],
      tags: params.body.tags ?? [],
      written_by: `user:${user}`,
      is_deleted: false,
    };

    await getMemoryClient().bulkCreate([page]);
    return pageToEntry(page);
  },
});

const getEntryRoute = createServerRoute({
  endpoint: 'GET /internal/streams/memory/entries/{id}',
  options: {
    access: 'internal',
    summary: 'Get a memory page by ID (page_name)',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ id: z.string() }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<MemoryEntry> => {
    const { uiSettingsClient, getMemoryClient } = await getScopedClients({ request });
    await assertMemoryEnabled(uiSettingsClient);

    const page = await getMemoryClient().findLatestByName(params.path.id);
    if (!page) {
      throw notFound(`Memory page not found: ${params.path.id}`);
    }
    return pageToEntry(page);
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
  handler: async ({ params, request, getScopedClients }): Promise<MemoryEntry> => {
    const { uiSettingsClient, getMemoryClient } = await getScopedClients({ request });
    await assertMemoryEnabled(uiSettingsClient);

    const page = await getMemoryClient().findLatestByName(params.query.name);
    if (!page) {
      throw notFound(`Page not found with name: ${params.query.name}`);
    }
    return pageToEntry(page);
  },
});

const updateEntryRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/memory/entries/{id}',
  options: {
    access: 'internal',
    summary: 'Update a memory page (appends new document with same page_name)',
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
      categories: z.array(z.string()).optional(),
      references: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
    }),
  }),
  handler: async ({ params, request, server, getScopedClients }): Promise<MemoryEntry> => {
    const { uiSettingsClient, getMemoryClient } = await getScopedClients({ request });
    await assertMemoryEnabled(uiSettingsClient);

    const authUser = server.core.security.authc.getCurrentUser(request);
    const user = authUser?.username ?? 'unknown';
    const client = getMemoryClient();

    const existing = await client.findLatestByName(params.path.id);
    if (!existing) {
      throw notFound(`Memory page not found: ${params.path.id}`);
    }

    const updated: StoredMemoryPage = {
      '@timestamp': new Date().toISOString(),
      page_name: params.path.id,
      title: params.body.title ?? (existing.title as string),
      content: params.body.content ?? (existing.content as string),
      categories: params.body.categories ?? toStringArray(existing.categories),
      references: params.body.references ?? toStringArray(existing.references),
      tags: params.body.tags ?? toStringArray(existing.tags),
      written_by: `user:${user}`,
      is_deleted: false,
    };

    await client.bulkCreate([updated]);
    return pageToEntry(updated);
  },
});

const deleteEntryRoute = createServerRoute({
  endpoint: 'DELETE /internal/streams/memory/entries/{id}',
  options: {
    access: 'internal',
    summary: 'Soft-delete a memory page (appends tombstone document)',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ id: z.string() }),
  }),
  handler: async ({ params, request, server, getScopedClients }): Promise<{ deleted: boolean }> => {
    const { uiSettingsClient, getMemoryClient } = await getScopedClients({ request });
    await assertMemoryEnabled(uiSettingsClient);

    const authUser = server.core.security.authc.getCurrentUser(request);
    const user = authUser?.username ?? 'unknown';
    const client = getMemoryClient();

    const existing = await client.findLatestByName(params.path.id);
    if (!existing) {
      throw notFound(`Memory page not found: ${params.path.id}`);
    }

    const tombstone: StoredMemoryPage = {
      '@timestamp': new Date().toISOString(),
      page_name: params.path.id,
      title: (existing.title as string) ?? '',
      content: (existing.content as string) ?? '',
      categories: toStringArray(existing.categories),
      references: toStringArray(existing.references),
      tags: toStringArray(existing.tags),
      written_by: `user:${user}`,
      is_deleted: true,
    };

    await client.bulkCreate([tombstone]);
    return { deleted: true };
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
      size: z.number().min(1).max(50).optional(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
  }): Promise<{ results: MemorySearchResult[] }> => {
    const { uiSettingsClient, getMemoryClient } = await getScopedClients({ request });
    await assertMemoryEnabled(uiSettingsClient);

    const { hits } = await getMemoryClient().findLatest();
    const lowerQuery = params.body.query.toLowerCase();
    const limit = params.body.size ?? 10;

    const matched = hits
      .filter(
        (p) =>
          String(p.title ?? '')
            .toLowerCase()
            .includes(lowerQuery) ||
          String(p.content ?? '')
            .toLowerCase()
            .includes(lowerQuery)
      )
      .slice(0, limit)
      .map((p): MemorySearchResult => {
        const content = String(p.content ?? '');
        const idx = content.toLowerCase().indexOf(lowerQuery);
        const snippet =
          idx >= 0
            ? content.substring(Math.max(0, idx - 60), idx + 140)
            : content.substring(0, 200);
        return {
          id: p.page_name as string,
          name: p.page_name as string,
          title: (p.title as string) ?? '',
          snippet,
          categories: toStringArray(p.categories),
          tags: toStringArray(p.tags),
        };
      });

    return { results: matched };
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
  handler: async ({ request, getScopedClients }): Promise<{ tree: MemoryCategoryNode[] }> => {
    const { uiSettingsClient, getMemoryClient } = await getScopedClients({ request });
    await assertMemoryEnabled(uiSettingsClient);

    const { hits } = await getMemoryClient().findLatest();
    return { tree: buildCategoryTree(hits.map(pageToEntry)) };
  },
});

export const internalMemoryRoutes = {
  ...createEntryRoute,
  ...getEntryRoute,
  ...getEntryByNameRoute,
  ...updateEntryRoute,
  ...deleteEntryRoute,
  ...searchRoute,
  ...getCategoryTreeRoute,
};
