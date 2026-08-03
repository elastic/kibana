/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import type { PatternDocument, PatternStatus, PatternsStorageClient } from './storage';
import { createPatternsStorageClient, patternsIndexName } from './storage';

const isIndexNotFound = (error: unknown): boolean =>
  isResponseError(error) && error.statusCode === 404;

/**
 * Owns the `.contextengine-patterns` store. Patterns are keyed by failure mode
 * (`pattern_key`) so the same failure across many cases upserts one record.
 */
export class PatternsService {
  private readonly storageClient: PatternsStorageClient;
  private readonly esClient: ElasticsearchClient;

  constructor({ esClient, logger }: { esClient: ElasticsearchClient; logger: Logger }) {
    this.storageClient = createPatternsStorageClient({ esClient, logger });
    this.esClient = esClient;
  }

  /** Deletes every pattern belonging to an AI index (used when resetting self-improvement). */
  async deleteByAiIndex(aiIndexId: string): Promise<number> {
    try {
      const response = await this.esClient.deleteByQuery({
        index: patternsIndexName,
        refresh: true,
        conflicts: 'proceed',
        query: { term: { ai_index_id: aiIndexId } },
      });
      return response.deleted ?? 0;
    } catch (error) {
      if (isIndexNotFound(error)) {
        return 0;
      }
      throw error;
    }
  }

  async ensureIndex(): Promise<void> {
    try {
      await this.storageClient.reconcileMappings();
    } catch {
      // Auto-created on first write.
    }
  }

  /** Upserts a pattern record, keyed on `pattern_key`. */
  async upsert(pattern: PatternDocument): Promise<void> {
    await this.storageClient.index({ id: pattern.pattern_key, document: pattern });
  }

  async get(patternKey: string): Promise<PatternDocument | undefined> {
    try {
      const response = await this.storageClient.get({ id: patternKey });
      return response.found && response._source ? response._source : undefined;
    } catch (error) {
      if (isIndexNotFound(error) || (isResponseError(error) && error.statusCode === 404)) {
        return undefined;
      }
      throw error;
    }
  }

  async list(aiIndexId?: string, size = 200): Promise<PatternDocument[]> {
    try {
      const response = await this.storageClient.search({
        size,
        track_total_hits: false,
        query: aiIndexId
          ? { bool: { filter: [{ term: { ai_index_id: aiIndexId } }] } }
          : { match_all: {} },
      });
      return response.hits.hits.flatMap((hit) =>
        hit._source ? [hit._source as PatternDocument] : []
      );
    } catch (error) {
      if (isIndexNotFound(error)) {
        return [];
      }
      throw error;
    }
  }

  async setStatus(patternKey: string, status: PatternStatus): Promise<void> {
    const existing = await this.get(patternKey);
    if (existing) {
      await this.upsert({ ...existing, status });
    }
  }
}
