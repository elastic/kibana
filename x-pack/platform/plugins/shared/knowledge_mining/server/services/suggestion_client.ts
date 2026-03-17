/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Logger } from '@kbn/core/server';
import type { Suggestion, SuggestionCreateRequest, SuggestionStatus } from '../../common/types';
import type { createSuggestionStorage } from '../storage';
import type { SuggestionProperties } from '../storage';
import type { MemoryClient } from './memory_client';
import { createSpaceDslFilter } from '../utils/spaces';

export interface SuggestionClient {
  create(request: SuggestionCreateRequest): Promise<Suggestion>;
  list(filters?: { status?: SuggestionStatus }): Promise<Suggestion[]>;
  get(id: string): Promise<Suggestion>;
  approve(id: string): Promise<Suggestion>;
  reject(id: string): Promise<Suggestion>;
  bulkApprove(ids: string[]): Promise<void>;
  bulkReject(ids: string[]): Promise<void>;
}

interface SuggestionDocument {
  _id: string;
  _source: SuggestionProperties;
}

const toSuggestion = (doc: SuggestionDocument): Suggestion => ({
  id: doc._id,
  ...doc._source,
  proposed_tags: doc._source.proposed_tags ?? [],
});

export class SuggestionClientImpl implements SuggestionClient {
  private readonly storage: ReturnType<typeof createSuggestionStorage>;
  private readonly space: string;
  private readonly username: string;
  private readonly logger: Logger;
  private readonly memoryClient: MemoryClient;

  constructor({
    storage,
    space,
    username,
    logger,
    memoryClient,
  }: {
    storage: ReturnType<typeof createSuggestionStorage>;
    space: string;
    username: string;
    logger: Logger;
    memoryClient: MemoryClient;
  }) {
    this.storage = storage;
    this.space = space;
    this.username = username;
    this.logger = logger;
    this.memoryClient = memoryClient;
  }

  async create(request: SuggestionCreateRequest): Promise<Suggestion> {
    const now = new Date().toISOString();
    const id = uuidv4();

    const document: SuggestionProperties = {
      action: request.action,
      target_memory_id: request.target_memory_id,
      target_path: request.target_path,
      proposed_title: request.proposed_title,
      proposed_content: request.proposed_content,
      proposed_path: request.proposed_path,
      proposed_memory_type: request.proposed_memory_type,
      proposed_tags: request.proposed_tags ?? [],
      reasoning: request.reasoning,
      status: 'pending',
      source_conversation_id: request.source_conversation_id,
      source_round_summary: request.source_round_summary,
      space: this.space,
      created_at: now,
    };

    await this.storage.getClient().index({ id, document });
    return this.get(id);
  }

  async list(filters: { status?: SuggestionStatus } = {}): Promise<Suggestion[]> {
    const must: Array<Record<string, unknown>> = [];
    if (filters.status) {
      must.push({ term: { status: filters.status } });
    }

    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1000,
      query: {
        bool: {
          filter: [createSpaceDslFilter(this.space)],
          must: must.length > 0 ? must : undefined,
        },
      },
      sort: [{ created_at: { order: 'desc' } }],
    });

    return response.hits.hits.map((hit) => toSuggestion(hit as unknown as SuggestionDocument));
  }

  async get(id: string): Promise<Suggestion> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: [createSpaceDslFilter(this.space), { term: { _id: id } }],
        },
      },
    });

    if (response.hits.hits.length === 0) {
      throw new Error(`Suggestion ${id} not found`);
    }
    return toSuggestion(response.hits.hits[0] as unknown as SuggestionDocument);
  }

  async approve(id: string): Promise<Suggestion> {
    const suggestion = await this.get(id);
    if (suggestion.status !== 'pending') {
      throw new Error(`Suggestion ${id} is not pending`);
    }

    await this.applySuggestion(suggestion);

    await this.storage.getClient().update({
      id,
      doc: {
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: this.username,
      },
    });

    return this.get(id);
  }

  async reject(id: string): Promise<Suggestion> {
    const suggestion = await this.get(id);
    if (suggestion.status !== 'pending') {
      throw new Error(`Suggestion ${id} is not pending`);
    }

    await this.storage.getClient().update({
      id,
      doc: {
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: this.username,
      },
    });

    return this.get(id);
  }

  async bulkApprove(ids: string[]): Promise<void> {
    for (const id of ids) {
      try {
        await this.approve(id);
      } catch (error) {
        this.logger.error(`Failed to approve suggestion ${id}: ${error}`);
      }
    }
  }

  async bulkReject(ids: string[]): Promise<void> {
    for (const id of ids) {
      try {
        await this.reject(id);
      } catch (error) {
        this.logger.error(`Failed to reject suggestion ${id}: ${error}`);
      }
    }
  }

  private async applySuggestion(suggestion: Suggestion): Promise<void> {
    switch (suggestion.action) {
      case 'create':
        await this.memoryClient.create({
          path: suggestion.proposed_path,
          title: suggestion.proposed_title,
          content: suggestion.proposed_content,
          memory_type: suggestion.proposed_memory_type ?? 'factual',
          tags: suggestion.proposed_tags,
          source_conversation_ids: suggestion.source_conversation_id
            ? [suggestion.source_conversation_id]
            : [],
        });
        break;

      case 'update':
        if (!suggestion.target_memory_id) {
          throw new Error('Cannot apply update suggestion without target_memory_id');
        }
        await this.memoryClient.update(suggestion.target_memory_id, {
          title: suggestion.proposed_title,
          content: suggestion.proposed_content,
          memory_type: suggestion.proposed_memory_type,
          tags: suggestion.proposed_tags,
          path: suggestion.proposed_path,
        });
        break;

      case 'delete':
        if (!suggestion.target_memory_id) {
          throw new Error('Cannot apply delete suggestion without target_memory_id');
        }
        await this.memoryClient.delete(suggestion.target_memory_id);
        break;

      default:
        throw new Error(`Unknown suggestion action: ${suggestion.action}`);
    }
  }
}
