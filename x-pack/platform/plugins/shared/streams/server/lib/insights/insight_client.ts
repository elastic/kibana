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
  INSIGHT_STATUS,
  INSIGHT_CREATED_AT,
  INSIGHT_UPDATED_AT,
} from './fields';
import type { InsightStorageSettings } from './storage_settings';
import type {
  StoredInsight,
  PersistedInsight,
  InsightInput,
  InsightStatus,
} from './stored_insight';
import { StatusError } from '../streams/errors/status_error';

interface InsightBulkIndexOperation {
  index: { insight: InsightInput; id?: string };
}

interface InsightBulkUpdateOperation {
  update: { id: string; insight: Partial<InsightInput>; status?: InsightStatus };
}

interface InsightBulkDeleteOperation {
  delete: { id: string };
}

export type InsightBulkOperation =
  | InsightBulkIndexOperation
  | InsightBulkUpdateOperation
  | InsightBulkDeleteOperation;

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
    const now = new Date().toISOString();
    const id = uuidv4();

    const document = toStorage({
      ...input,
      id,
      status: 'active',
      created_at: now,
      updated_at: now,
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
  async list(filters?: {
    status?: InsightStatus;
    impact?: string[];
  }): Promise<{ hits: PersistedInsight[]; total: number }> {
    const filterClauses: QueryDslQueryContainer[] = [];

    if (filters?.status) {
      filterClauses.push({ term: { [INSIGHT_STATUS]: filters.status } });
    }

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
      sort: [{ [INSIGHT_CREATED_AT]: { order: 'desc' } }],
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
   * Update an existing insight
   */
  async update(
    id: string,
    input: Partial<InsightInput> & { status?: InsightStatus }
  ): Promise<PersistedInsight> {
    // First verify the insight exists
    const existing = await this.get(id);

    const now = new Date().toISOString();

    const updated: PersistedInsight = {
      ...existing,
      ...input,
      updated_at: now,
    };

    const document = toStorage(updated);

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
   * Bulk operations for insights
   */
  async bulk(operations: InsightBulkOperation[]): Promise<{ acknowledged: boolean }> {
    const now = new Date().toISOString();

    // Validate that update/delete operations target existing documents
    const updateDeleteIds = operations.flatMap((op) => {
      if ('update' in op) return [op.update.id];
      if ('delete' in op) return [op.delete.id];
      return [];
    });

    if (updateDeleteIds.length > 0) {
      const existingDocs = await this.clients.storageClient.search({
        size: updateDeleteIds.length,
        track_total_hits: false,
        query: {
          bool: {
            filter: [{ terms: { _id: updateDeleteIds } }],
          },
        },
      });

      const existingIds = new Set(existingDocs.hits.hits.map((hit) => hit._id));
      const missingIds = updateDeleteIds.filter((id) => !existingIds.has(id));

      if (missingIds.length > 0) {
        throw new StatusError(`Insights not found: ${missingIds.join(', ')}`, 404);
      }
    }

    // Build storage operations
    const storageOperations = await Promise.all(
      operations.map(async (operation) => {
        if ('index' in operation) {
          const id = operation.index.id || uuidv4();
          const document = toStorage({
            ...operation.index.insight,
            id,
            status: 'active',
            created_at: now,
            updated_at: now,
          });
          return {
            index: {
              document,
              _id: id,
            },
          };
        }

        if ('update' in operation) {
          const existing = await this.get(operation.update.id);
          const updated: PersistedInsight = {
            ...existing,
            ...operation.update.insight,
            ...(operation.update.status && { status: operation.update.status }),
            updated_at: now,
          };
          const document = toStorage(updated);
          return {
            index: {
              document,
              _id: operation.update.id,
            },
          };
        }

        return { delete: { _id: operation.delete.id } };
      })
    );

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
    [INSIGHT_STATUS]: insight.status,
    [INSIGHT_CREATED_AT]: insight.created_at,
    [INSIGHT_UPDATED_AT]: insight.updated_at,
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
    status: stored[INSIGHT_STATUS],
    created_at: stored[INSIGHT_CREATED_AT],
    updated_at: stored[INSIGHT_UPDATED_AT],
  };
}
