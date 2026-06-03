/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { esql } from '@elastic/esql';
import type { IStorageClient } from '@kbn/storage-adapter';
import type { Insight, InsightImpactLevel } from '@kbn/streams-schema';
import { INSIGHT_IMPACT, INSIGHT_IMPACT_LEVEL, INSIGHT_GENERATED_AT } from './fields';
import type { InsightStorageSettings } from './storage_settings';
import { StatusError } from '../../../streams/errors/status_error';
import {
  normalizeColumn,
  getColumnIndex,
  getSourceColumnIndex,
} from '../../../streams/helpers/esql';

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
    const response = await this.clients.storageClient.esql({
      metadata: ['_id', '_source'],
      pipeline: esql`WHERE _id == ${{ id }} | LIMIT 1`,
    });

    const sourceIdx = getSourceColumnIndex(response);
    const source =
      sourceIdx >= 0 ? (response.values[0]?.[sourceIdx] as Insight | undefined) : undefined;

    if (!source) {
      throw new StatusError(`Insight ${id} not found`, 404);
    }

    return source;
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

    const response = await this.clients.storageClient.esql({
      metadata: ['_id', '_source'],
      pipeline: esql`SORT ${normalizeColumn(INSIGHT_IMPACT_LEVEL)} ASC, ${normalizeColumn(
        INSIGHT_GENERATED_AT
      )} DESC | LIMIT ${esql.num(10_000)}`,
      ...(filterClauses.length > 0 ? { filter: { bool: { filter: filterClauses } } } : {}),
    });

    const sourceIdx = getSourceColumnIndex(response);
    const insights = sourceIdx >= 0 ? response.values.map((row) => row[sourceIdx] as Insight) : [];

    return {
      insights,
      total: insights.length,
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
      // ES|QL `IN (?param)` does not expand array params — emit one literal per value.
      const idLiterals = deleteIds.map((id) => esql.str(id));

      const existingResponse = await this.clients.storageClient.esql({
        metadata: ['_id', '_source'],
        pipeline: esql`WHERE _id IN (${idLiterals}) | LIMIT ${esql.num(deleteIds.length)}`,
      });

      const idIdx = getColumnIndex(existingResponse, '_id');
      const existingIds = new Set(
        idIdx >= 0 ? existingResponse.values.map((row) => row[idIdx] as string) : []
      );
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
