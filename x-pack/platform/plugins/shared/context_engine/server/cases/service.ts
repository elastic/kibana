/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import type { CaseDocument, CasePartition, CasesStorageClient } from './storage';
import { casesIndexName, createCasesStorageClient } from './storage';

const isIndexNotFound = (error: unknown): boolean =>
  isResponseError(error) && error.statusCode === 404;

/**
 * Owns the `.contextengine-cases` corpus. The `case_builder` task writes cases;
 * the `trace_classifier` task reads unclassified cases and writes labels; the
 * patterns API reads a pattern's member cases.
 */
export class CasesService {
  private readonly storageClient: CasesStorageClient;
  private readonly esClient: ElasticsearchClient;

  constructor({ esClient, logger }: { esClient: ElasticsearchClient; logger: Logger }) {
    this.storageClient = createCasesStorageClient({ esClient, logger });
    this.esClient = esClient;
  }

  /** Deletes every case belonging to an AI index (used when resetting self-improvement). */
  async deleteByAiIndex(aiIndexId: string): Promise<number> {
    try {
      const response = await this.esClient.deleteByQuery({
        index: casesIndexName,
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

  /** Best-effort bootstrap of the index + mapping. Writes also auto-create it. */
  async ensureIndex(): Promise<void> {
    try {
      await this.storageClient.reconcileMappings();
    } catch {
      // The index is auto-created on the first write; nothing to do here.
    }
  }

  async write(cases: CaseDocument[]): Promise<void> {
    if (cases.length === 0) {
      return;
    }
    await this.storageClient.bulk({
      operations: cases.map((doc) => ({ index: { _id: doc.case_id, document: doc } })),
    });
  }

  async list(
    options: {
      aiIndexId?: string;
      patternKey?: string;
      partition?: CasePartition;
      unclassifiedOnly?: boolean;
      size?: number;
    } = {}
  ): Promise<CaseDocument[]> {
    const { aiIndexId, patternKey, partition, unclassifiedOnly, size = 100 } = options;
    const filter: estypes.QueryDslQueryContainer[] = [];
    if (aiIndexId) {
      filter.push({ term: { ai_index_id: aiIndexId } });
    }
    if (patternKey) {
      filter.push({ term: { pattern_key: patternKey } });
    }
    if (partition) {
      filter.push({ term: { partition } });
    }
    if (unclassifiedOnly) {
      filter.push({ term: { classified: false } });
    }

    try {
      const response = await this.storageClient.search({
        size,
        track_total_hits: false,
        query: { bool: { filter } },
      });
      return response.hits.hits.flatMap((hit) =>
        hit._source ? [hit._source as CaseDocument] : []
      );
    } catch (error) {
      if (isIndexNotFound(error)) {
        return [];
      }
      throw error;
    }
  }
}
