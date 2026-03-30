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
import type { QuestionsStorage } from './questions_storage';
import { createQuestionsStorage } from './questions_storage';
import type {
  MemoryEntry,
  MemoryVersionRecord,
  MemoryChangeType,
  MemoryTreeNode,
  MemorySearchResult,
  MemoryQuestion,
  CreateMemoryParams,
  UpdateMemoryParams,
  SearchMemoryParams,
  CreateQuestionParams,
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

const getParentPath = (path: string): string => {
  const parts = path.split('/');
  return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
};

interface QuestionDocument {
  _id: string;
  _source: MemoryQuestion;
}

export class MemoryServiceImpl implements MemoryService {
  private readonly storage: MemoryStorage;
  private readonly historyStorage: MemoryHistoryStorage;
  private readonly questionsStorage: QuestionsStorage;
  constructor({ logger, esClient }: { logger: Logger; esClient: ElasticsearchClient }) {
    this.storage = createMemoryStorage({ logger, esClient });
    this.historyStorage = createMemoryHistoryStorage({ logger, esClient });
    this.questionsStorage = createQuestionsStorage({ logger, esClient });
  }

  async create(params: CreateMemoryParams): Promise<MemoryEntry> {
    const { path, title, content, tags = [], user } = params;

    // Check for duplicate path
    const existing = await this._getByPath(path);
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

  async get({ id }: { id: string }): Promise<MemoryEntry> {
    const doc = await this._getById(id);
    if (!doc) {
      throw notFound(`Memory entry with id '${id}' not found`);
    }
    return doc._source;
  }

  async getByPath({ path }: { path: string }): Promise<MemoryEntry | undefined> {
    const doc = await this._getByPath(path);
    return doc?._source;
  }

  async update(params: UpdateMemoryParams): Promise<MemoryEntry> {
    const { id, user, changeSummary } = params;
    const doc = await this._getById(id);
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

  async delete({ id, user }: { id: string; user: string }): Promise<void> {
    const doc = await this._getById(id);
    if (!doc) {
      throw notFound(`Memory entry with id '${id}' not found`);
    }

    const now = new Date().toISOString();
    await this.storage.getClient().delete({ id: doc._id });
    await this._writeHistory(
      { ...doc._source, updated_at: now },
      'delete',
      `Deleted entry at ${doc._source.path}`,
      user
    );
  }

  async move({
    id,
    newPath,
    user,
  }: {
    id: string;
    newPath: string;
    user: string;
  }): Promise<MemoryEntry> {
    const doc = await this._getById(id);
    if (!doc) {
      throw notFound(`Memory entry with id '${id}' not found`);
    }

    // Check if target path already exists
    const existing = await this._getByPath(newPath);
    if (existing) {
      throw badRequest(`Memory entry at path '${newPath}' already exists`);
    }

    const oldPath = doc._source.path;
    return this.update({
      id,
      path: newPath,
      user,
      changeSummary: `Moved from ${oldPath} to ${newPath}`,
    });
  }

  async search(params: SearchMemoryParams): Promise<MemorySearchResult[]> {
    const { query, tags, parentPath, size = 10 } = params;

    const filters: QueryDslQueryContainer[] = [];
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
          ...(filters.length > 0 ? { filter: filters } : {}),
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

  async listChildren({ parentPath }: { parentPath: string }): Promise<MemoryEntry[]> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      query: {
        bool: {
          filter: [{ term: { parent_path: parentPath } }],
        },
      },
      size: 1000,
      sort: [{ path: { order: 'asc' } }],
    });

    return response.hits.hits.map((hit) => (hit as MemoryDocument)._source);
  }

  async listAll(): Promise<MemoryEntry[]> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      query: { match_all: {} },
      size: 10000,
      sort: [{ path: { order: 'asc' } }],
    });

    return response.hits.hits.map((hit) => (hit as MemoryDocument)._source);
  }

  async getTree(): Promise<MemoryTreeNode[]> {
    const entries = await this.listAll();
    return buildTree(entries);
  }

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

  async rollback({
    entryId,
    version,
    user,
  }: {
    entryId: string;
    version: number;
    user: string;
  }): Promise<MemoryEntry> {
    const targetVersion = await this.getVersion({ entryId, version });
    const doc = await this._getById(entryId);
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

  async getRecentChanges({ size = 20 }: { size?: number }): Promise<MemoryVersionRecord[]> {
    const response = await this.historyStorage.getClient().search({
      track_total_hits: false,
      query: { match_all: {} },
      size,
      sort: [{ created_at: { order: 'desc' } }],
    });

    return response.hits.hits.map((hit) => (hit as HistoryDocument)._source);
  }

  // ── Questions ──

  async createQuestion(params: CreateQuestionParams): Promise<MemoryQuestion> {
    const { question, category, relatedEntries, context, user } = params;
    const now = new Date().toISOString();
    const id = uuidV4();

    const doc: MemoryQuestion = {
      id,
      question,
      category,
      related_entries: relatedEntries,
      context,
      status: 'open',
      created_at: now,
      created_by: user,
    };

    await this.questionsStorage.getClient().index({ document: doc });
    return doc;
  }

  async getOpenQuestions({ size = 50 }: { size?: number } = {}): Promise<MemoryQuestion[]> {
    const response = await this.questionsStorage.getClient().search({
      track_total_hits: false,
      query: {
        bool: {
          filter: [{ term: { status: 'open' } }],
        },
      },
      size,
      sort: [{ created_at: { order: 'desc' } }],
    });

    return response.hits.hits.map((hit) => (hit as QuestionDocument)._source);
  }

  async answerQuestion({ id, answer }: { id: string; answer: string }): Promise<MemoryQuestion> {
    const response = await this.questionsStorage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: { bool: { filter: [{ term: { id } }] } },
    });

    if (response.hits.hits.length === 0) {
      throw notFound(`Question with id '${id}' not found`);
    }

    const hit = response.hits.hits[0] as QuestionDocument;
    const updated: MemoryQuestion = {
      ...hit._source,
      status: 'answered',
      answer,
    };

    await this.questionsStorage.getClient().index({ id: hit._id, document: updated });
    return updated;
  }

  async dismissQuestion({ id }: { id: string }): Promise<void> {
    const response = await this.questionsStorage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: { bool: { filter: [{ term: { id } }] } },
    });

    if (response.hits.hits.length === 0) {
      throw notFound(`Question with id '${id}' not found`);
    }

    const hit = response.hits.hits[0] as QuestionDocument;
    const updated: MemoryQuestion = {
      ...hit._source,
      status: 'dismissed',
    };

    await this.questionsStorage.getClient().index({ id: hit._id, document: updated });
  }

  // ── Private helpers ──

  private async _getById(id: string): Promise<MemoryDocument | undefined> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
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

  private async _getByPath(path: string): Promise<MemoryDocument | undefined> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: [{ term: { path } }],
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
