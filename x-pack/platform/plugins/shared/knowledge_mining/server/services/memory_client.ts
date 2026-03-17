/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Logger } from '@kbn/core/server';
import type {
  Memory,
  MemoryCreateRequest,
  MemoryUpdateRequest,
  MemorySearchOptions,
} from '../../common/types';
import type { createMemoryStorage } from '../storage';
import type { MemoryProperties } from '../storage';
import { createSpaceDslFilter } from '../utils/spaces';

export interface MemoryClient {
  create(request: MemoryCreateRequest): Promise<Memory>;
  update(id: string, request: MemoryUpdateRequest): Promise<Memory>;
  delete(id: string): Promise<boolean>;
  get(id: string): Promise<Memory>;
  getByPath(path: string): Promise<Memory | undefined>;
  list(options?: MemorySearchOptions): Promise<Memory[]>;
  search(query: string, options?: Omit<MemorySearchOptions, 'query'>): Promise<Memory[]>;
}

interface MemoryDocument {
  _id: string;
  _source: MemoryProperties;
  _seq_no?: number;
  _primary_term?: number;
}

const toMemory = (doc: MemoryDocument): Memory => ({
  id: doc._id,
  ...doc._source,
  tags: doc._source.tags ?? [],
  source_conversation_ids: doc._source.source_conversation_ids ?? [],
});

const getDirectory = (path: string): string => {
  const parts = path.split('/');
  return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
};

export class MemoryClientImpl implements MemoryClient {
  private readonly storage: ReturnType<typeof createMemoryStorage>;
  private readonly space: string;
  private readonly username: string;
  private readonly logger: Logger;

  constructor({
    storage,
    space,
    username,
    logger,
  }: {
    storage: ReturnType<typeof createMemoryStorage>;
    space: string;
    username: string;
    logger: Logger;
  }) {
    this.storage = storage;
    this.space = space;
    this.username = username;
    this.logger = logger;
  }

  async create(request: MemoryCreateRequest): Promise<Memory> {
    const now = new Date().toISOString();
    const id = uuidv4();

    const document: MemoryProperties = {
      path: request.path,
      directory: getDirectory(request.path),
      title: request.title,
      content: request.content,
      memory_type: request.memory_type,
      tags: request.tags ?? [],
      space: this.space,
      created_by: this.username,
      updated_by: this.username,
      created_at: now,
      updated_at: now,
      source_conversation_ids: request.source_conversation_ids ?? [],
      version: 1,
    };

    await this.storage.getClient().index({ id, document });
    return this.get(id);
  }

  async update(id: string, request: MemoryUpdateRequest): Promise<Memory> {
    const existing = await this._get(id);
    if (!existing) {
      throw new Error(`Memory ${id} not found`);
    }

    const now = new Date().toISOString();
    const updatedDoc: MemoryProperties = {
      ...existing._source,
      ...(request.title !== undefined && { title: request.title }),
      ...(request.content !== undefined && { content: request.content }),
      ...(request.memory_type !== undefined && { memory_type: request.memory_type }),
      ...(request.tags !== undefined && { tags: request.tags }),
      ...(request.path !== undefined && {
        path: request.path,
        directory: getDirectory(request.path),
      }),
      updated_by: this.username,
      updated_at: now,
      version: (existing._source.version ?? 0) + 1,
    };

    await this.storage.getClient().index({
      id,
      document: updatedDoc,
      if_seq_no: existing._seq_no,
      if_primary_term: existing._primary_term,
    });

    return this.get(id);
  }

  async delete(id: string): Promise<boolean> {
    const { result } = await this.storage.getClient().delete({ id });
    return result === 'deleted';
  }

  async get(id: string): Promise<Memory> {
    const doc = await this._get(id);
    if (!doc) {
      throw new Error(`Memory ${id} not found`);
    }
    return toMemory(doc);
  }

  async getByPath(path: string): Promise<Memory | undefined> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: [createSpaceDslFilter(this.space), { term: { path } }],
        },
      },
    });

    if (response.hits.hits.length === 0) {
      return undefined;
    }
    return toMemory(response.hits.hits[0] as unknown as MemoryDocument);
  }

  async list(options: MemorySearchOptions = {}): Promise<Memory[]> {
    const { memory_type: memoryType, tags, directory, limit = 1000 } = options;

    const must: Array<Record<string, unknown>> = [];
    if (memoryType) {
      must.push({ term: { memory_type: memoryType } });
    }
    if (tags && tags.length > 0) {
      must.push({ terms: { tags } });
    }
    if (directory) {
      must.push({ term: { directory } });
    }

    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: limit,
      query: {
        bool: {
          filter: [createSpaceDslFilter(this.space)],
          must: must.length > 0 ? must : undefined,
        },
      },
      sort: [{ updated_at: { order: 'desc' } }],
    });

    return response.hits.hits.map((hit) => toMemory(hit as unknown as MemoryDocument));
  }

  async search(query: string, options: Omit<MemorySearchOptions, 'query'> = {}): Promise<Memory[]> {
    const { memory_type: memoryType, tags, limit = 20 } = options;

    const must: Array<Record<string, unknown>> = [
      {
        multi_match: {
          query,
          fields: ['title^2', 'content', 'path', 'tags'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      },
    ];

    if (memoryType) {
      must.push({ term: { memory_type: memoryType } });
    }
    if (tags && tags.length > 0) {
      must.push({ terms: { tags } });
    }

    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: limit,
      query: {
        bool: {
          filter: [createSpaceDslFilter(this.space)],
          must,
        },
      },
    });

    return response.hits.hits.map((hit) => toMemory(hit as unknown as MemoryDocument));
  }

  private async _get(id: string): Promise<MemoryDocument | undefined> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      seq_no_primary_term: true,
      query: {
        bool: {
          filter: [createSpaceDslFilter(this.space), { term: { _id: id } }],
        },
      },
    });

    if (response.hits.hits.length === 0) {
      return undefined;
    }
    return response.hits.hits[0] as unknown as MemoryDocument;
  }
}
