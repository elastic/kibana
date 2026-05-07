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
import type { MemoryStorage } from './storage';
import { createMemoryStorage } from './storage';
import type { MemoryHistoryStorage } from './history_storage';
import { createMemoryHistoryStorage } from './history_storage';
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

interface MemoryDocument {
  _id: string;
  _source: MemoryEntry;
  _seq_no: number;
  _primary_term: number;
}

interface HistoryDocument {
  _id: string;
  _source: MemoryVersionRecord;
}

export class MemoryServiceImpl implements MemoryService {
  private readonly storage: MemoryStorage;
  private readonly historyStorage: MemoryHistoryStorage;
  private readonly logger: Logger;
  constructor({ logger, esClient }: { logger: Logger; esClient: ElasticsearchClient }) {
    this.logger = logger;
    this.storage = createMemoryStorage({ logger, esClient });
    this.historyStorage = createMemoryHistoryStorage({ logger, esClient });
  }

  async create(params: CreateMemoryParams): Promise<MemoryEntry> {
    const { name, title, content, categories = [], references = [], tags = [], user } = params;

    // Check for duplicate name
    const existing = await this._getByName(name);
    if (existing) {
      throw badRequest(`Memory entry with name '${name}' already exists`);
    }

    const now = new Date().toISOString();
    const id = uuidV4();
    const entry: MemoryEntry = {
      id,
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

    await this.storage.getClient().index({ id, document: entry });
    await this._writeHistory(entry, 'create', `Created entry "${name}"`, user);

    return entry;
  }

  async get({ id }: { id: string }): Promise<MemoryEntry> {
    const doc = await this._getById(id);
    if (!doc) {
      throw notFound(`Memory entry with id '${id}' not found`);
    }
    return doc._source;
  }

  async getByName({ name }: { name: string }): Promise<MemoryEntry | undefined> {
    const doc = await this._getByName(name);
    return doc?._source;
  }

  async update(params: UpdateMemoryParams): Promise<MemoryEntry> {
    const { id, user, changeSummary } = params;
    const doc = await this._getById(id);
    if (!doc) {
      throw notFound(`Memory entry with id '${id}' not found`);
    }

    // If renaming, check for duplicate name
    if (params.name !== undefined && params.name !== doc._source.name) {
      const existingWithName = await this._getByName(params.name);
      if (existingWithName) {
        throw badRequest(`Memory entry with name '${params.name}' already exists`);
      }
    }

    const current = doc._source;
    const now = new Date().toISOString();
    const updatedEntry: MemoryEntry = {
      ...current,
      ...(params.content !== undefined && { content: params.content }),
      ...(params.title !== undefined && { title: params.title }),
      ...(params.name !== undefined && { name: params.name }),
      ...(params.categories !== undefined && { categories: params.categories }),
      ...(params.references !== undefined && { references: params.references }),
      ...(params.tags !== undefined && { tags: params.tags }),
      version: current.version + 1,
      updated_at: now,
      updated_by: user,
    };

    await this.storage.getClient().index({
      id: doc._id,
      document: updatedEntry,
      if_seq_no: doc._seq_no,
      if_primary_term: doc._primary_term,
    });

    const changeType: MemoryChangeType =
      params.name !== undefined && params.name !== current.name ? 'rename' : 'update';
    await this._writeHistory(
      updatedEntry,
      changeType,
      changeSummary ?? `Updated entry "${updatedEntry.name}"`,
      user
    );

    return updatedEntry;
  }

  async delete({ id, user }: { id: string; user: string }): Promise<void> {
    const doc = await this._getById(id);
    if (!doc) {
      throw notFound(`Memory entry with id '${id}' not found`);
    }

    const now = new Date().toISOString();
    await this.storage.getClient().delete({
      id: doc._id,
      if_seq_no: doc._seq_no,
      if_primary_term: doc._primary_term,
    });
    await this._writeHistory(
      { ...doc._source, updated_at: now },
      'delete',
      `Deleted entry "${doc._source.name}"`,
      user
    );
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
    const doc = await this._getById(id);
    if (!doc) {
      throw notFound(`Memory entry with id '${id}' not found`);
    }

    // Check if target name already exists (but not self)
    const existing = await this._getByName(newName);
    if (existing && existing._source.id !== id) {
      throw badRequest(`Memory entry with name '${newName}' already exists`);
    }

    const oldName = doc._source.name;
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
      transform: (categories) => (categories.includes(category) ? null : [...categories, category]),
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
      transform: (categories) =>
        categories.includes(category) ? categories.filter((c) => c !== category) : null,
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
    const doc = await this._getById(id);
    if (!doc) {
      throw notFound(`Memory entry with id '${id}' not found`);
    }

    const newCategories = transform(doc._source.categories);
    if (newCategories === null) {
      return doc._source;
    }

    const now = new Date().toISOString();
    const updatedEntry: MemoryEntry = {
      ...doc._source,
      categories: newCategories,
      version: doc._source.version + 1,
      updated_at: now,
      updated_by: user,
    };

    await this.storage.getClient().index({
      id: doc._id,
      document: updatedEntry,
      if_seq_no: doc._seq_no,
      if_primary_term: doc._primary_term,
    });

    await this._writeHistory(updatedEntry, 'update', changeSummary, user);
    return updatedEntry;
  }

  async listCategories(): Promise<string[]> {
    const entries = await this.listAll();
    const categorySet = new Set<string>();
    for (const entry of entries) {
      for (const cat of entry.categories) {
        categorySet.add(cat);
      }
    }
    return Array.from(categorySet).sort();
  }

  async getCategoryTree(): Promise<MemoryCategoryNode[]> {
    const entries = await this.listAll();
    return buildCategoryTree(entries);
  }

  // ── References ──

  async getBacklinks({ id }: { id: string }): Promise<MemoryEntry[]> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      query: {
        bool: {
          filter: [{ term: { references: id } }],
        },
      },
      size: 1000,
    });
    return response.hits.hits.map((hit) => (hit as MemoryDocument)._source);
  }

  // ── Search & browse ──

  async search(params: SearchMemoryParams): Promise<MemorySearchResult[]> {
    const { query, tags, categories, references, size = 10 } = params;
    const escapedQuery = query.toLowerCase().replace(/[\\*?]/g, '\\$&');

    const filters: QueryDslQueryContainer[] = [];
    if (tags && tags.length > 0) {
      filters.push({ terms: { tags } });
    }
    if (categories && categories.length > 0) {
      filters.push({ terms: { categories } });
    }
    if (references && references.length > 0) {
      filters.push({ terms: { references } });
    }

    const response = await this.storage.getClient().search({
      track_total_hits: false,
      query: {
        bool: {
          ...(filters.length > 0 ? { filter: filters } : {}),
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
                  {
                    wildcard: {
                      name: { value: `*${escapedQuery}*`, boost: 2 },
                    },
                  },
                  {
                    wildcard: {
                      categories: { value: `*${escapedQuery}*`, boost: 2 },
                    },
                  },
                  {
                    wildcard: {
                      tags: { value: `*${escapedQuery}*`, boost: 2 },
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      size,
      _source: ['id', 'name', 'title', 'content', 'updated_at', 'updated_by', 'tags', 'categories'],
      highlight: {
        fields: {
          content: { fragment_size: 200, number_of_fragments: 1 },
          title: {},
        },
      },
    });

    return response.hits.hits.map((hit) => {
      const source = hit._source as MemoryEntry;
      const highlight = (hit as { highlight?: Record<string, string[]> }).highlight;
      const snippet = highlight?.content?.[0] ?? source.content.substring(0, 200);

      return {
        id: source.id,
        name: source.name,
        title: source.title,
        snippet,
        score: hit._score ?? 0,
        updated_at: source.updated_at,
        updated_by: source.updated_by,
        tags: source.tags ?? [],
        categories: source.categories ?? [],
      };
    });
  }

  async listAll(): Promise<MemoryEntry[]> {
    const response = await this.storage.getClient().search({
      track_total_hits: true,
      query: { match_all: {} },
      size: 10000,
      sort: [{ name: { order: 'asc' } }],
    });

    const total = response.hits.total as { value: number; relation: string } | undefined;
    if (total && total.value > 10000) {
      this.logger.warn(
        `Memory listAll returned 10000 entries but total is ${total.value}. Some entries may be missing.`
      );
    }

    return response.hits.hits.map((hit) => (hit as MemoryDocument)._source);
  }

  async listByCategory({ category }: { category: string }): Promise<MemoryEntry[]> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      query: {
        bool: {
          filter: [{ term: { categories: category } }],
        },
      },
      size: 1000,
      sort: [{ name: { order: 'asc' } }],
    });

    return response.hits.hits.map((hit) => (hit as MemoryDocument)._source);
  }

  // ── History ──

  async getHistory({
    entryId,
    size = 50,
  }: {
    entryId: string;
    size?: number;
  }): Promise<MemoryVersionRecord[]> {
    const response = await this.historyStorage.getClient().search({
      track_total_hits: false,
      query: {
        bool: {
          filter: [{ term: { entry_id: entryId } }],
        },
      },
      size,
      sort: [{ version: { order: 'desc' } }],
    });

    return response.hits.hits.map((hit) => (hit as HistoryDocument)._source);
  }

  async getVersion({
    entryId,
    version,
  }: {
    entryId: string;
    version: number;
  }): Promise<MemoryVersionRecord> {
    const response = await this.historyStorage.getClient().search({
      track_total_hits: false,
      query: {
        bool: {
          filter: [{ term: { entry_id: entryId } }, { term: { version } }],
        },
      },
      size: 1,
      terminate_after: 1,
    });

    if (response.hits.hits.length === 0) {
      throw notFound(`Version ${version} not found for entry '${entryId}'`);
    }

    return (response.hits.hits[0] as HistoryDocument)._source;
  }

  async getRecentChanges({ size = 20 }: { size?: number }): Promise<MemoryVersionRecord[]> {
    const response = await this.historyStorage.getClient().search({
      track_total_hits: false,
      query: { match_all: {} },
      size,
      sort: [{ created_at: { order: 'desc' } }],
    });

    return response.hits.hits.map((hit) => (hit as HistoryDocument)._source);
  }

  // ── Private helpers ──

  private async _getById(id: string): Promise<MemoryDocument | undefined> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      seq_no_primary_term: true,
      query: {
        bool: {
          filter: [{ term: { id } }],
        },
      },
    });
    if (response.hits.hits.length === 0) {
      return undefined;
    }
    return response.hits.hits[0] as MemoryDocument;
  }

  private async _getByName(name: string): Promise<MemoryDocument | undefined> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      seq_no_primary_term: true,
      query: {
        bool: {
          filter: [{ term: { name } }],
        },
      },
    });
    if (response.hits.hits.length === 0) {
      return undefined;
    }
    return response.hits.hits[0] as MemoryDocument;
  }

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

    // Ensure all ancestors exist
    if (parts.length > 1) {
      const parentCategory = parts.slice(0, -1).join('/');
      const parent = getOrCreateNode(parentCategory);
      if (!parent.children.some((c) => c.category === category)) {
        parent.children.push(node);
      }
    }

    return node;
  };

  // Populate pages into categories
  for (const entry of entries) {
    for (const category of entry.categories) {
      const node = getOrCreateNode(category);
      node.pages.push({ id: entry.id, name: entry.name, title: entry.title });
    }
  }

  // Collect roots (categories with no parent)
  const roots: MemoryCategoryNode[] = [];
  for (const [category, node] of nodeMap) {
    const parts = category.split('/');
    if (parts.length === 1) {
      roots.push(node);
    }
  }

  // Sort everything alphabetically
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
