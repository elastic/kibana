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
import type { CompactionLogStorage } from './compaction_log_storage';
import { createCompactionLogStorage } from './compaction_log_storage';
import { createSpaceDslFilter } from './space_filter';
import type {
  MemoryEntry,
  MemoryVersionRecord,
  MemoryChangeType,
  CompactionLogEntry,
  MemoryTreeNode,
  MemorySearchResult,
  CreateMemoryParams,
  UpdateMemoryParams,
  SearchMemoryParams,
  CompactMemoryParams,
  MemoryService,
} from './types';

interface MemoryDocument {
  _id: string;
  _source: MemoryEntry;
}

interface HistoryDocument {
  _id: string;
  _source: MemoryVersionRecord;
}

interface CompactionDocument {
  _id: string;
  _source: CompactionLogEntry;
}

const getParentPath = (path: string): string => {
  const parts = path.split('/');
  return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
};

export class MemoryServiceImpl implements MemoryService {
  private readonly storage: MemoryStorage;
  private readonly historyStorage: MemoryHistoryStorage;
  private readonly compactionStorage: CompactionLogStorage;

  constructor({ logger, esClient }: { logger: Logger; esClient: ElasticsearchClient }) {
    this.storage = createMemoryStorage({ logger, esClient });
    this.historyStorage = createMemoryHistoryStorage({ logger, esClient });
    this.compactionStorage = createCompactionLogStorage({ logger, esClient });
  }

  async create(params: CreateMemoryParams): Promise<MemoryEntry> {
    const { path, title, content, tags = [], space, user } = params;

    // Check for duplicate path
    const existing = await this._getByPath(path, space);
    if (existing) {
      throw badRequest(`Memory entry at path '${path}' already exists`);
    }

    const now = new Date().toISOString();
    const id = uuidV4();
    const entry: MemoryEntry = {
      id,
      path,
      title,
      content,
      parent_path: getParentPath(path),
      space,
      version: 1,
      tags,
      created_at: now,
      updated_at: now,
      created_by: user,
      updated_by: user,
    };

    await this.storage.getClient().index({ document: entry });
    await this._writeHistory(entry, 'create', `Created entry at ${path}`, user);

    return entry;
  }

  async get({ id, space }: { id: string; space: string }): Promise<MemoryEntry> {
    const doc = await this._getById(id, space);
    if (!doc) {
      throw notFound(`Memory entry with id '${id}' not found`);
    }
    return doc._source;
  }

  async getByPath({
    path,
    space,
  }: {
    path: string;
    space: string;
  }): Promise<MemoryEntry | undefined> {
    const doc = await this._getByPath(path, space);
    return doc?._source;
  }

  async update(params: UpdateMemoryParams): Promise<MemoryEntry> {
    const { id, space, user, changeSummary } = params;
    const doc = await this._getById(id, space);
    if (!doc) {
      throw notFound(`Memory entry with id '${id}' not found`);
    }

    const current = doc._source;
    const now = new Date().toISOString();
    const updatedEntry: MemoryEntry = {
      ...current,
      ...(params.content !== undefined && { content: params.content }),
      ...(params.title !== undefined && { title: params.title }),
      ...(params.tags !== undefined && { tags: params.tags }),
      ...(params.path !== undefined && {
        path: params.path,
        parent_path: getParentPath(params.path),
      }),
      version: current.version + 1,
      updated_at: now,
      updated_by: user,
    };

    await this.storage.getClient().index({
      id: doc._id,
      document: updatedEntry,
    });

    const changeType: MemoryChangeType =
      params.path !== undefined && params.path !== current.path ? 'move' : 'update';
    await this._writeHistory(
      updatedEntry,
      changeType,
      changeSummary ?? `Updated entry at ${updatedEntry.path}`,
      user
    );

    return updatedEntry;
  }

  async delete({ id, space, user }: { id: string; space: string; user: string }): Promise<void> {
    const doc = await this._getById(id, space);
    if (!doc) {
      throw notFound(`Memory entry with id '${id}' not found`);
    }

    await this.storage.getClient().delete({ id: doc._id });
    await this._writeHistory(doc._source, 'delete', `Deleted entry at ${doc._source.path}`, user);
  }

  async move({
    id,
    newPath,
    space,
    user,
  }: {
    id: string;
    newPath: string;
    space: string;
    user: string;
  }): Promise<MemoryEntry> {
    const doc = await this._getById(id, space);
    if (!doc) {
      throw notFound(`Memory entry with id '${id}' not found`);
    }

    // Check if target path already exists
    const existing = await this._getByPath(newPath, space);
    if (existing) {
      throw badRequest(`Memory entry at path '${newPath}' already exists`);
    }

    const oldPath = doc._source.path;
    return this.update({
      id,
      path: newPath,
      space,
      user,
      changeSummary: `Moved from ${oldPath} to ${newPath}`,
    });
  }

  async search(params: SearchMemoryParams): Promise<MemorySearchResult[]> {
    const { query, space, tags, parentPath, size = 10 } = params;

    const filters: QueryDslQueryContainer[] = [createSpaceDslFilter(space)];
    if (tags && tags.length > 0) {
      filters.push({ terms: { tags } });
    }
    if (parentPath !== undefined) {
      filters.push({ prefix: { path: parentPath ? `${parentPath}/` : '' } });
    }

    const response = await this.storage.getClient().search({
      track_total_hits: false,
      query: {
        bool: {
          filter: filters,
          must: [
            {
              multi_match: {
                query,
                fields: ['title^3', 'content', 'tags^2', 'path^2'],
                type: 'best_fields',
                fuzziness: 'AUTO',
              },
            },
          ],
        },
      },
      size,
      _source: ['id', 'path', 'title', 'content', 'updated_at', 'updated_by', 'tags'],
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
        path: source.path,
        title: source.title,
        snippet,
        score: hit._score ?? 0,
        updated_at: source.updated_at,
        updated_by: source.updated_by,
        tags: source.tags ?? [],
      };
    });
  }

  async listChildren({
    parentPath,
    space,
  }: {
    parentPath: string;
    space: string;
  }): Promise<MemoryEntry[]> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      query: {
        bool: {
          filter: [createSpaceDslFilter(space), { term: { parent_path: parentPath } }],
        },
      },
      size: 1000,
      sort: [{ path: { order: 'asc' } }],
    });

    return response.hits.hits.map((hit) => (hit as MemoryDocument)._source);
  }

  async listAll({ space }: { space: string }): Promise<MemoryEntry[]> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      query: {
        bool: {
          filter: [createSpaceDslFilter(space)],
        },
      },
      size: 10000,
      sort: [{ path: { order: 'asc' } }],
    });

    return response.hits.hits.map((hit) => (hit as MemoryDocument)._source);
  }

  async getTree({ space }: { space: string }): Promise<MemoryTreeNode[]> {
    const entries = await this.listAll({ space });
    return buildTree(entries);
  }

  async getHistory({
    entryId,
    space,
    size = 50,
  }: {
    entryId: string;
    space: string;
    size?: number;
  }): Promise<MemoryVersionRecord[]> {
    const response = await this.historyStorage.getClient().search({
      track_total_hits: false,
      query: {
        bool: {
          filter: [createSpaceDslFilter(space), { term: { entry_id: entryId } }],
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
    space,
  }: {
    entryId: string;
    version: number;
    space: string;
  }): Promise<MemoryVersionRecord> {
    const response = await this.historyStorage.getClient().search({
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            createSpaceDslFilter(space),
            { term: { entry_id: entryId } },
            { term: { version } },
          ],
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

  async rollback({
    entryId,
    version,
    space,
    user,
  }: {
    entryId: string;
    version: number;
    space: string;
    user: string;
  }): Promise<MemoryEntry> {
    const targetVersion = await this.getVersion({ entryId, version, space });
    const doc = await this._getById(entryId, space);
    if (!doc) {
      throw notFound(`Memory entry with id '${entryId}' not found`);
    }

    const now = new Date().toISOString();
    const rolledBackEntry: MemoryEntry = {
      ...doc._source,
      content: targetVersion.content,
      title: targetVersion.title,
      path: targetVersion.path,
      parent_path: getParentPath(targetVersion.path),
      version: doc._source.version + 1,
      updated_at: now,
      updated_by: user,
    };

    await this.storage.getClient().index({
      id: doc._id,
      document: rolledBackEntry,
    });

    await this._writeHistory(rolledBackEntry, 'update', `Rolled back to version ${version}`, user);

    return rolledBackEntry;
  }

  async compact(params: CompactMemoryParams): Promise<void> {
    const { entryIds, operation, summary, space, user, conversationId } = params;
    const now = new Date().toISOString();

    const logEntry: CompactionLogEntry = {
      id: uuidV4(),
      operation,
      affected_entries: entryIds,
      summary,
      space,
      created_at: now,
      created_by: user,
      ...(conversationId && { source_conversation_id: conversationId }),
    };

    await this.compactionStorage.getClient().index({ document: logEntry });
  }

  async getCompactionLog({
    space,
    size = 50,
  }: {
    space: string;
    size?: number;
  }): Promise<CompactionLogEntry[]> {
    const response = await this.compactionStorage.getClient().search({
      track_total_hits: false,
      query: {
        bool: {
          filter: [createSpaceDslFilter(space)],
        },
      },
      size,
      sort: [{ created_at: { order: 'desc' } }],
    });

    return response.hits.hits.map((hit) => (hit as CompactionDocument)._source);
  }

  // ── Private helpers ──

  private async _getById(id: string, space: string): Promise<MemoryDocument | undefined> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: [createSpaceDslFilter(space), { term: { id } }],
        },
      },
    });
    if (response.hits.hits.length === 0) {
      return undefined;
    }
    return response.hits.hits[0] as MemoryDocument;
  }

  private async _getByPath(path: string, space: string): Promise<MemoryDocument | undefined> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: [createSpaceDslFilter(space), { term: { path } }],
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
      path: entry.path,
      title: entry.title,
      content: entry.content,
      change_type: changeType,
      change_summary: changeSummary,
      space: entry.space,
      created_at: entry.updated_at,
      created_by: user,
    };
    await this.historyStorage.getClient().index({ document: record });
  }
}

/**
 * Build a tree structure from a flat list of memory entries.
 */
const buildTree = (entries: MemoryEntry[]): MemoryTreeNode[] => {
  const nodeMap = new Map<string, MemoryTreeNode>();
  const roots: MemoryTreeNode[] = [];

  // First pass: create nodes for all entries and their parent paths
  for (const entry of entries) {
    const node: MemoryTreeNode = {
      path: entry.path,
      title: entry.title,
      id: entry.id,
      has_children: false,
      children: [],
    };
    nodeMap.set(entry.path, node);

    // Ensure all ancestor paths exist as directory nodes
    const parts = entry.path.split('/');
    for (let i = 1; i < parts.length; i++) {
      const ancestorPath = parts.slice(0, i).join('/');
      if (!nodeMap.has(ancestorPath)) {
        nodeMap.set(ancestorPath, {
          path: ancestorPath,
          title: parts[i - 1],
          has_children: false,
          children: [],
        });
      }
    }
  }

  // Second pass: wire up parent-child relationships
  for (const [path, node] of nodeMap) {
    const parentPath = getParentPath(path);
    if (parentPath && nodeMap.has(parentPath)) {
      const parent = nodeMap.get(parentPath)!;
      parent.children.push(node);
      parent.has_children = true;
    } else {
      roots.push(node);
    }
  }

  // Sort children alphabetically
  const sortNodes = (nodes: MemoryTreeNode[]) => {
    nodes.sort((a, b) => a.path.localeCompare(b.path));
    for (const node of nodes) {
      sortNodes(node.children);
    }
  };
  sortNodes(roots);

  return roots;
};
