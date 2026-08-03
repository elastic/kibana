/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import type { ImprovementDocument, ImprovementsStorageClient } from './storage';
import { createImprovementsStorageClient, improvementsIndexName } from './storage';

const isIndexNotFound = (error: unknown): boolean =>
  isResponseError(error) && error.statusCode === 404;

/**
 * Owns the `.contextengine-improvements` store: the fix attempts (proposed by
 * the management agent) against a pattern, and their measured outcomes.
 */
export class ImprovementsService {
  private readonly storageClient: ImprovementsStorageClient;
  private readonly esClient: ElasticsearchClient;

  constructor({ esClient, logger }: { esClient: ElasticsearchClient; logger: Logger }) {
    this.storageClient = createImprovementsStorageClient({ esClient, logger });
    this.esClient = esClient;
  }

  /** Deletes every improvement belonging to an AI index (used when resetting self-improvement). */
  async deleteByAiIndex(aiIndexId: string): Promise<number> {
    try {
      const response = await this.esClient.deleteByQuery({
        index: improvementsIndexName,
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

  async create(improvement: ImprovementDocument): Promise<void> {
    await this.storageClient.index({
      id: improvement.improvement_id,
      document: improvement,
    });
  }

  async get(improvementId: string): Promise<ImprovementDocument | undefined> {
    try {
      const response = await this.storageClient.get({ id: improvementId });
      return response.found && response._source ? response._source : undefined;
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 404) {
        return undefined;
      }
      throw error;
    }
  }

  async list(patternKey: string, size = 50): Promise<ImprovementDocument[]> {
    try {
      const response = await this.storageClient.search({
        size,
        track_total_hits: false,
        query: { bool: { filter: [{ term: { pattern_key: patternKey } }] } },
      });
      return response.hits.hits.flatMap((hit) =>
        hit._source ? [hit._source as ImprovementDocument] : []
      );
    } catch (error) {
      if (isIndexNotFound(error)) {
        return [];
      }
      throw error;
    }
  }

  async update(improvementId: string, patch: Partial<ImprovementDocument>): Promise<void> {
    const existing = await this.get(improvementId);
    if (!existing) {
      return;
    }
    await this.storageClient.index({
      id: improvementId,
      document: { ...existing, ...patch },
    });
  }
}
