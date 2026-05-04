/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IStorageClient } from '@kbn/storage-adapter';
import { isNotFoundError } from '@kbn/es-errors';
import type { Insight, InsightImpactLevel } from '@kbn/streams-schema';
import { INSIGHT_IMPACT, INSIGHT_IMPACT_LEVEL, INSIGHT_GENERATED_AT } from './fields';
import type { InsightStorageSettings } from './storage_settings';
import { StatusError } from '../../../streams/errors/status_error';

interface InsightBulkIndexOperation {
  index: Insight;
}

interface InsightBulkDeleteOperation {
  delete: { id: string };
}

export type InsightBulkOperation = InsightBulkIndexOperation | InsightBulkDeleteOperation;

export class InsightClient {
  constructor(
    private readonly clients: {
      storageClient: IStorageClient<InsightStorageSettings, Insight>;
    }
  ) {}

  async clean() {
    await this.clients.storageClient.clean();
  }

  /**
   * Upsert an insight (create or overwrite).
   */
  async upsert(insight: Insight): Promise<Insight> {
    await this.clients.storageClient.index({
      id: insight.id,
      document: insight,
    });
    return insight;
  }

  /**
   * Get a single insight by ID
   */
  async get(id: string): Promise<Insight> {
    const hit = await this.clients.storageClient.get({ id }).catch((err) => {
      if (isNotFoundError(err)) {
        throw new StatusError(`Insight ${id} not found`, 404);
      }
      throw err;
    });

    return hit._source!;
  }

  /**
   * List all insights with optional filters
   */
  async list(filters?: {
    impact?: InsightImpactLevel[];
  }): Promise<{ insights: Insight[]; total: number }> {
    const filterClauses: QueryDslQueryContainer[] = [];

    if (filters?.impact?.length) {
      filterClauses.push({
        terms: { [INSIGHT_IMPACT]: filters.impact },
      });
    }

    const response = await this.clients.storageClient.search({
      size: 10_000,
      track_total_hits: false,
      sort: [
        { [INSIGHT_IMPACT_LEVEL]: 'asc' as const },
        { [INSIGHT_GENERATED_AT]: 'desc' as const },
      ],
      query:
        filterClauses.length > 0
          ? {
              bool: {
                filter: filterClauses,
              },
            }
          : { match_all: {} },
    });

    const insights = response.hits.hits.map((hit) => hit._source!);

    return {
      insights,
      total:
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value ?? 0,
    };
  }

  /**
   * Delete an insight by ID
   */
  async delete(id: string): Promise<{ acknowledged: boolean }> {
    // First verify the insight exists
    await this.get(id);

    await this.clients.storageClient.delete({ id });

    return { acknowledged: true };
  }

  /**
   * Bulk operations for insights (save/delete only)
   */
  async bulk(operations: InsightBulkOperation[]): Promise<{ acknowledged: boolean }> {
    // Validate that delete operations target existing documents
    const deleteIds = operations.flatMap((op) => {
      if ('delete' in op) return [op.delete.id];
      return [];
    });

    if (deleteIds.length > 0) {
      const existingDocs = await this.clients.storageClient.search({
        size: deleteIds.length,
        track_total_hits: false,
        query: {
          bool: {
            filter: [{ terms: { _id: deleteIds } }],
          },
        },
      });

      const existingIds = new Set(existingDocs.hits.hits.map((hit) => hit._id));
      const missingIds = deleteIds.filter((id) => !existingIds.has(id));

      if (missingIds.length > 0) {
        throw new StatusError(`Insights not found: ${missingIds.join(', ')}`, 404);
      }
    }

    // Build storage operations (insight must include id, generatedAt, impactLevel)
    const storageOperations = operations.map((operation) => {
      if ('index' in operation) {
        const insight = operation.index;
        return {
          index: {
            document: insight,
            _id: insight.id,
          },
        };
      }

      return { delete: { _id: operation.delete.id } };
    });

    await this.clients.storageClient.bulk({
      operations: storageOperations,
      throwOnFail: true,
    });

    return { acknowledged: true };
  }
}
