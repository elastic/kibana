/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { badRequest, notFound } from '@hapi/boom';
import { createMemoryHistoryStorage } from './history_storage';
import { MEMORIES_DATA_STREAM } from '../../../common/constants';
import type {
  MemoryEntry,
  MemoryVersionRecord,
  MemoryChangeType,
  MemoryCategoryNode,
  MemorySearchResult,
  CreateMemoryParams,
  UpdateMemoryParams,
  SearchMemoryParams,
  MemoryService,
} from './types';

const isIndexNotFoundError = (err: unknown): boolean => {
  const statusCode = (err as { statusCode?: number }).statusCode;
  if (statusCode === 404) return true;
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('index_not_found_exception');
};

type MemoryCollapseField = 'name' | 'id';

/**
 * MemoryServiceImpl backed by two append-only data streams:
 *   - .significant_events-memories  (pages, latest version resolved via field collapse)
 *   - .significant_events-memory-history  (version history, append-only)
 *
 * Pages are written by indexing a new document with the current @timestamp.
 * Lookups by name collapse on `name`; lookups and listings by logical page collapse on `id`.
 * Tombstones bump `version` and set `is_deleted: true`; reads filter those out after collapse.
 */
export class MemoryServiceImpl implements MemoryService {
  private readonly esClient: ElasticsearchClient;
  private readonly historyStorage: ReturnType<typeof createMemoryHistoryStorage>;
  private readonly logger: Logger;

  constructor({ logger, esClient }: { logger: Logger; esClient: ElasticsearchClient }) {
    this.logger = logger;
    this.esClient = esClient;
    this.historyStorage = createMemoryHistoryStorage({ esClient });
  }

  // ── Write helpers ──

  private async _indexPage(entry: MemoryEntry): Promise<void> {
    await this.esClient.index({
      index: MEMORIES_DATA_STREAM,
      document: {
        '@timestamp': entry.updated_at,
        is_deleted: false,
        ...entry,
      },
    });
  }

  // ── Reads: field collapse to resolve latest version ──

  private async _searchLatest(
    query: QueryDslQueryContainer,
    collapseField: MemoryCollapseField,
    size = 1
  ): Promise<Array<{ _source: MemoryEntry }>> {
    try {
      const response = await this.esClient.search({
        index: MEMORIES_DATA_STREAM,
        track_total_hits: false,
        size,
        query,
        collapse: { field: collapseField },
        sort: [{ version: { order: 'desc' } }, { updated_at: { order: 'desc' } }],
      });
      return response.hits.hits as Array<{ _source: MemoryEntry }>;
    } catch (err) {
      if (isIndexNotFoundError(err)) return [];
      throw err;
    }
  }

  private async _indexNameTombstone(
    entry: MemoryEntry,
    name: string,
    user: string,
    now: string
  ): Promise<void> {
    const tombstone: MemoryEntry = {
      ...entry,
      name,
      version: entry.version + 1,
      updated_at: now,
      updated_by: user,
      is_deleted: true,
    };
    await this.esClient.index({
      index: MEMORIES_DATA_STREAM,
      document: {
        '@timestamp': now,
        ...tombstone,
      },
    });
  }

  private async _getCollapsedByName(name: string): Promise<MemoryEntry | undefined> {
    const hits = await this._searchLatest({ bool: { filter: [{ term: { name } }] } }, 'name');
    return hits[0]?._source;
  }

  private async _getByName(name: string): Promise<MemoryEntry | undefined> {
    const entry = await this._getCollapsedByName(name);
    return entry?.is_deleted !== true ? entry : undefined;
  }

  private async _getById(id: string): Promise<MemoryEntry | undefined> {
    const hits = await this._searchLatest({ bool: { filter: [{ term: { id } }] } }, 'id');
    const entry = hits[0]?._source;
    return entry?.is_deleted !== true ? entry : undefined;
  }

  // ── Public API ──

  async create(params: CreateMemoryParams): Promise<MemoryEntry> {
    const { name, title, content, categories = [], references = [], tags = [], user } = params;

    const existing = await this._getByName(name);
    if (existing) {
      throw badRequest(`Memory entry with name '${name}' already exists`);
    }

    const now = new Date().toISOString();
    const tombstone = await this._getCollapsedByName(name);
    if (tombstone?.is_deleted === true) {
      const restored: MemoryEntry = {
        id: tombstone.id,
        name,
        title,
        content,
        categories,
        references,
        tags,
        version: tombstone.version + 1,
        created_at: tombstone.created_at,
        updated_at: now,
        created_by: tombstone.created_by,
        updated_by: user,
      };
      await this._indexPage(restored);
      await this._writeHistory(restored, 'create', `Restored entry "${name}"`, user);
      return restored;
    }

    const entry: MemoryEntry = {
      id: uuidV4(),
      name,
      title,
      content,
      categories,
      references,
      version: 1,
      tags,
      created_at: now,
      updated_at: now,
      created_by: user,
      updated_by: user,
    };

    await this._indexPage(entry);
    await this._writeHistory(entry, 'create', `Created entry "${name}"`, user);
    return entry;
  }

  async get({ id }: { id: string }): Promise<MemoryEntry> {
    const entry = await this._getById(id);
    if (!entry) throw notFound(`Memory entry with id '${id}' not found`);
    return entry;
  }

  async getByName({ name }: { name: string }): Promise<MemoryEntry | undefined> {
    return this._getByName(name);
  }

  async update(params: UpdateMemoryParams): Promise<MemoryEntry> {
    const { id, user, changeSummary } = params;
    const current = await this._getById(id);
    if (!current) throw notFound(`Memory entry with id '${id}' not found`);

    const newName = params.name;
    const isRename = newName !== undefined && newName !== current.name;
    if (isRename) {
      const existingWithName = await this._getByName(newName);
      if (existingWithName) {
        throw badRequest(`Memory entry with name '${newName}' already exists`);
      }
    }

    const now = new Date().toISOString();
    let nextVersion = current.version + 1;

    if (isRename) {
      await this._indexNameTombstone(current, current.name, user, now);
      nextVersion = current.version + 2;
    }

    const updated: MemoryEntry = {
      ...current,
      ...(params.content !== undefined && { content: params.content }),
      ...(params.title !== undefined && { title: params.title }),
      ...(params.name !== undefined && { name: params.name }),
      ...(params.categories !== undefined && { categories: params.categories }),
      ...(params.references !== undefined && { references: params.references }),
      ...(params.tags !== undefined && { tags: params.tags }),
      version: nextVersion,
      updated_at: now,
      updated_by: user,
    };

    await this._indexPage(updated);

    const changeType: MemoryChangeType = isRename ? 'rename' : 'update';
    await this._writeHistory(
      updated,
      changeType,
      changeSummary ?? `Updated entry "${updated.name}"`,
      user
    );
    return updated;
  }

  async delete({ id, user }: { id: string; user: string }): Promise<void> {
    const current = await this._getById(id);
    if (!current) throw notFound(`Memory entry with id '${id}' not found`);

    const now = new Date().toISOString();
    const tombstone: MemoryEntry = {
      ...current,
      version: current.version + 1,
      updated_at: now,
      updated_by: user,
      is_deleted: true,
    };
    // Append a soft-delete tombstone (version must increase so collapse picks it over the live doc).
    await this.esClient.index({
      index: MEMORIES_DATA_STREAM,
      document: {
        '@timestamp': now,
        ...tombstone,
      },
    });
    await this._writeHistory(tombstone, 'delete', `Deleted entry "${current.name}"`, user);
  }

  async rename({
    id,
    newName,
    user,
  }: {
    id: string;
    newName: string;
    user: string;
  }): Promise<MemoryEntry> {
    const current = await this._getById(id);
    if (!current) throw notFound(`Memory entry with id '${id}' not found`);
    const existing = await this._getByName(newName);
    if (existing && existing.id !== id) {
      throw badRequest(`Memory entry with name '${newName}' already exists`);
    }
    const oldName = current.name;
    return this.update({
      id,
      name: newName,
      user,
      changeSummary: `Renamed from "${oldName}" to "${newName}"`,
    });
  }

  // ── Categories ──

  async addCategory({
    id,
    category,
    user,
  }: {
    id: string;
    category: string;
    user: string;
  }): Promise<MemoryEntry> {
    return this._updateCategories({
      id,
      user,
      transform: (cats) => (cats.includes(category) ? null : [...cats, category]),
      changeSummary: `Added category "${category}"`,
    });
  }

  async removeCategory({
    id,
    category,
    user,
  }: {
    id: string;
    category: string;
    user: string;
  }): Promise<MemoryEntry> {
    return this._updateCategories({
      id,
      user,
      transform: (cats) => (cats.includes(category) ? cats.filter((c) => c !== category) : null),
      changeSummary: `Removed category "${category}"`,
    });
  }

  private async _updateCategories({
    id,
    user,
    transform,
    changeSummary,
  }: {
    id: string;
    user: string;
    transform: (categories: string[]) => string[] | null;
    changeSummary: string;
  }): Promise<MemoryEntry> {
    const current = await this._getById(id);
    if (!current) throw notFound(`Memory entry with id '${id}' not found`);

    const newCategories = transform(current.categories);
    if (newCategories === null) return current;

    const now = new Date().toISOString();
    const updated: MemoryEntry = {
      ...current,
      categories: newCategories,
      version: current.version + 1,
      updated_at: now,
      updated_by: user,
    };
    await this._indexPage(updated);
    await this._writeHistory(updated, 'update', changeSummary, user);
    return updated;
  }

  async listCategories(): Promise<string[]> {
    const entries = await this.listAll();
    const categorySet = new Set<string>();
    for (const entry of entries) {
      for (const cat of entry.categories) categorySet.add(cat);
    }
    return Array.from(categorySet).sort();
  }

  async getCategoryTree(): Promise<MemoryCategoryNode[]> {
    return buildCategoryTree(await this.listAll());
  }

  // ── References ──

  async getBacklinks({ id }: { id: string }): Promise<MemoryEntry[]> {
    return (
      await this._searchLatest({ bool: { filter: [{ term: { references: id } }] } }, 'id', 1000)
    )
      .map((h) => h._source)
      .filter((entry) => entry.is_deleted !== true);
  }

  // ── Search & browse ──

  async search(params: SearchMemoryParams): Promise<MemorySearchResult[]> {
    const { query, tags, categories, references, size = 10 } = params;
    const escapedQuery = query.toLowerCase().replace(/[\\*?]/g, '\\$&');

    const filters: QueryDslQueryContainer[] = [];
    if (tags?.length) filters.push({ terms: { tags } });
    if (categories?.length) filters.push({ terms: { categories } });
    if (references?.length) filters.push({ terms: { references } });

    let response;
    try {
      response = await this.esClient.search({
        index: MEMORIES_DATA_STREAM,
        track_total_hits: false,
        collapse: { field: 'id' },
        sort: [{ version: { order: 'desc' } }, { updated_at: { order: 'desc' } }],
        query: {
          bool: {
            filter: filters,
            must: [
              {
                bool: {
                  should: [
                    {
                      multi_match: {
                        query,
                        fields: ['title^3', 'content'],
                        type: 'best_fields',
                        fuzziness: 'AUTO',
                      },
                    },
                    { wildcard: { name: { value: `*${escapedQuery}*`, boost: 2 } } },
                    { wildcard: { categories: { value: `*${escapedQuery}*`, boost: 2 } } },
                    { wildcard: { tags: { value: `*${escapedQuery}*`, boost: 2 } } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
        size,
        highlight: {
          fields: { content: { fragment_size: 200, number_of_fragments: 1 }, title: {} },
        },
      });
    } catch (err) {
      if (isIndexNotFoundError(err)) return [];
      throw err;
    }

    return response.hits.hits
      .map((hit) => {
        const source = hit._source as MemoryEntry;
        if (source.is_deleted === true) {
          return undefined;
        }
        const highlight = (hit as { highlight?: Record<string, string[]> }).highlight;
        return {
          id: source.id,
          name: source.name,
          title: source.title,
          snippet: highlight?.content?.[0] ?? source.content.substring(0, 200),
          score: hit._score ?? 0,
          updated_at: source.updated_at,
          updated_by: source.updated_by,
          tags: source.tags ?? [],
          categories: source.categories ?? [],
        };
      })
      .filter((result): result is MemorySearchResult => result !== undefined);
  }

  async listAll(): Promise<MemoryEntry[]> {
    try {
      const response = await this.esClient.search({
        index: MEMORIES_DATA_STREAM,
        track_total_hits: true,
        query: { match_all: {} },
        collapse: { field: 'id' },
        sort: [{ version: { order: 'desc' } }, { updated_at: { order: 'desc' } }],
        size: 10000,
      });

      const total = response.hits.total as { value: number } | undefined;
      if (total && total.value > 10000) {
        this.logger.warn(
          `Memory listAll: total ${total.value} exceeds 10000, some entries may be missing`
        );
      }
      return response.hits.hits
        .map((h) => h._source as MemoryEntry)
        .filter((entry) => entry.is_deleted !== true);
    } catch (err) {
      if (isIndexNotFoundError(err)) return [];
      throw err;
    }
  }

  async listByCategory({ category }: { category: string }): Promise<MemoryEntry[]> {
    try {
      const response = await this.esClient.search({
        index: MEMORIES_DATA_STREAM,
        track_total_hits: false,
        query: {
          bool: { filter: [{ term: { categories: category } }] },
        },
        collapse: { field: 'id' },
        sort: [{ version: { order: 'desc' } }, { updated_at: { order: 'desc' } }],
        size: 1000,
      });
      return response.hits.hits
        .map((h) => h._source as MemoryEntry)
        .filter((entry) => entry.is_deleted !== true);
    } catch (err) {
      if (isIndexNotFoundError(err)) return [];
      throw err;
    }
  }

  // ── History ──

  async getHistory({
    entryId,
    size = 50,
  }: {
    entryId: string;
    size?: number;
  }): Promise<MemoryVersionRecord[]> {
    try {
      const response = await this.historyStorage.getClient().search({
        track_total_hits: false,
        query: { bool: { filter: [{ term: { entry_id: entryId } }] } },
        size,
        sort: [{ version: { order: 'desc' } }],
      });
      return response.hits.hits.map((h) => h._source);
    } catch (err) {
      if (isIndexNotFoundError(err)) return [];
      throw err;
    }
  }

  async getVersion({
    entryId,
    version,
  }: {
    entryId: string;
    version: number;
  }): Promise<MemoryVersionRecord> {
    try {
      const response = await this.historyStorage.getClient().search({
        track_total_hits: false,
        query: { bool: { filter: [{ term: { entry_id: entryId } }, { term: { version } }] } },
        size: 1,
        terminate_after: 1,
      });
      if (response.hits.hits.length === 0) {
        throw notFound(`Version ${version} not found for entry '${entryId}'`);
      }
      return response.hits.hits[0]._source;
    } catch (err) {
      if (isIndexNotFoundError(err)) {
        throw notFound(`Version ${version} not found for entry '${entryId}'`);
      }
      throw err;
    }
  }

  async getRecentChanges({ size = 20 }: { size?: number } = {}): Promise<MemoryVersionRecord[]> {
    try {
      const response = await this.historyStorage.getClient().search({
        track_total_hits: false,
        query: { match_all: {} },
        size,
        sort: [{ created_at: { order: 'desc' } }],
      });
      return response.hits.hits.map((h) => h._source);
    } catch (err) {
      if (isIndexNotFoundError(err)) return [];
      throw err;
    }
  }

  // ── Private helpers ──

  private async _writeHistory(
    entry: MemoryEntry,
    changeType: MemoryChangeType,
    changeSummary: string,
    user: string
  ): Promise<void> {
    const record: MemoryVersionRecord = {
      id: uuidV4(),
      entry_id: entry.id,
      version: entry.version,
      name: entry.name,
      title: entry.title,
      content: entry.content,
      change_type: changeType,
      change_summary: changeSummary,
      created_at: entry.updated_at,
      created_by: user,
    };
    await this.historyStorage.getClient().index({ document: record });
  }
}

/**
 * Build a category tree from all memory entries.
 * Categories use "/" as separator for hierarchy (e.g. "streams/logs-otel").
 */
const buildCategoryTree = (entries: MemoryEntry[]): MemoryCategoryNode[] => {
  const nodeMap = new Map<string, MemoryCategoryNode>();

  const getOrCreateNode = (category: string): MemoryCategoryNode => {
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
      const parentCategory = parts.slice(0, -1).join('/');
      const parent = getOrCreateNode(parentCategory);
      if (!parent.children.some((c) => c.category === category)) {
        parent.children.push(node);
      }
    }
    return node;
  };

  for (const entry of entries) {
    for (const category of entry.categories) {
      const node = getOrCreateNode(category);
      node.pages.push({ id: entry.id, name: entry.name, title: entry.title });
    }
  }

  const roots: MemoryCategoryNode[] = [];
  for (const [category, node] of nodeMap) {
    if (!category.includes('/')) roots.push(node);
  }

  const sortNodes = (nodes: MemoryCategoryNode[]) => {
    nodes.sort((a, b) => a.category.localeCompare(b.category));
    for (const node of nodes) {
      node.pages.sort((a, b) => a.name.localeCompare(b.name));
      sortNodes(node.children);
    }
  };
  sortNodes(roots);
  return roots;
};
