/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IStorageClient } from '@kbn/storage-adapter';
import { isNotFoundError } from '@kbn/es-errors';
import { v4 as uuidv4 } from 'uuid';
import {
  INSIGHT_ID,
  INSIGHT_TITLE,
  INSIGHT_DESCRIPTION,
  INSIGHT_IMPACT,
  INSIGHT_EVIDENCE,
  INSIGHT_RECOMMENDATIONS,
} from './fields';
import type { InsightStorageSettings } from './storage_settings';
import type { StoredInsight, PersistedInsight, InsightInput } from './stored_insight';
import { StatusError } from '../../streams/errors/status_error';

interface InsightBulkIndexOperation {
  index: { insight: InsightInput; id?: string };
}

interface InsightBulkDeleteOperation {
  delete: { id: string };
}

export type InsightBulkOperation = InsightBulkIndexOperation | InsightBulkDeleteOperation;

export class InsightClient {
  constructor(
    private readonly clients: {
      storageClient: IStorageClient<InsightStorageSettings, StoredInsight>;
    }
  ) {}

  async clean() {
    await this.clients.storageClient.clean();
  }

  /**
   * Create a new insight
   */
  async create(input: InsightInput): Promise<PersistedInsight> {
    const id = uuidv4();

    const document = toStorage({
      ...input,
      id,
    });

    await this.clients.storageClient.index({
      id,
      document,
    });

    return fromStorage(document);
  }

  /**
   * Get a single insight by ID
   */
  async get(id: string): Promise<PersistedInsight> {
    const hit = await this.clients.storageClient.get({ id }).catch((err) => {
      if (isNotFoundError(err)) {
        throw new StatusError(`Insight ${id} not found`, 404);
      }
      throw err;
    });

    return fromStorage(hit._source!);
  }

  /**
   * List all insights with optional filters
   */
  async list(filters?: { impact?: string[] }): Promise<{ hits: PersistedInsight[]; total: number }> {
    const filterClauses: QueryDslQueryContainer[] = [];

    if (filters?.impact?.length) {
      filterClauses.push({
        bool: {
          should: filters.impact.map((level) => ({ term: { [INSIGHT_IMPACT]: level } })),
          minimum_should_match: 1,
        },
      });
    }

    const response = await this.clients.storageClient.search({
      size: 10_000,
      track_total_hits: true,
      _source: true,
      query:
        filterClauses.length > 0
          ? {
              bool: {
                filter: filterClauses,
              },
            }
          : { match_all: {} },
    });

    const hits: PersistedInsight[] = [];
    for (const hit of response.hits.hits) {
      if (hit._source) {
        try {
          hits.push(fromStorage(hit._source));
        } catch {
          // Skip malformed documents
        }
      }
    }

    return {
      hits,
      total:
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value ?? 0,
    };
  }

  /**
   * Save an insight (create or update)
   */
  async save(id: string, input: InsightInput): Promise<PersistedInsight> {
    const document = toStorage({
      ...input,
      id,
    });

    await this.clients.storageClient.index({
      id,
      document,
    });

    return fromStorage(document);
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

    // Build storage operations
    const storageOperations = operations.map((operation) => {
      if ('index' in operation) {
        const id = operation.index.id || uuidv4();
        const document = toStorage({
          ...operation.index.insight,
          id,
        });
        return {
          index: {
            document,
            _id: id,
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

function toStorage(insight: PersistedInsight): StoredInsight {
  return {
    [INSIGHT_ID]: insight.id,
    [INSIGHT_TITLE]: insight.title,
    [INSIGHT_DESCRIPTION]: insight.description,
    [INSIGHT_IMPACT]: insight.impact,
    [INSIGHT_EVIDENCE]: insight.evidence,
    [INSIGHT_RECOMMENDATIONS]: insight.recommendations,
  };
}

function fromStorage(stored: StoredInsight): PersistedInsight {
  return {
    id: stored[INSIGHT_ID],
    title: stored[INSIGHT_TITLE],
    description: stored[INSIGHT_DESCRIPTION],
    impact: stored[INSIGHT_IMPACT],
    evidence: stored[INSIGHT_EVIDENCE],
    recommendations: stored[INSIGHT_RECOMMENDATIONS],
  };
}
