/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LRUCache } from 'lru-cache';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataStreamMetadataManager } from './data_stream_metadata_manager';
import type { DocumentVersionFields } from '../../types';

const VERSION_CACHE_MAX = 32;
const VERSION_CACHE_TTL_MS = 60_000;
// getByIds uses the same window: a document that just rolled over is still in the
// previous backing index, and a search cannot see a write that has not refreshed.
const REALTIME_BACKING_INDEX_WINDOW = 2;

export interface DocumentVersionManagerDeps {
  esClient: ElasticsearchClient;
  dataStreamName: string;
  metadataManager: DataStreamMetadataManager;
  /** Legacy indexes that may still hold documents; searched after the data stream. */
  additionalIndexesToQuery?: string[];
}

export class DocumentVersionManager {
  private readonly cache = new LRUCache<string, Required<DocumentVersionFields>>({
    max: VERSION_CACHE_MAX,
    ttl: VERSION_CACHE_TTL_MS,
  });

  constructor(private readonly deps: DocumentVersionManagerDeps) {}

  setVersion(id: string, version: Required<DocumentVersionFields>): void {
    this.cache.set(id, version);
  }

  bulkGetCachedVersions(ids: string[]): Record<string, Required<DocumentVersionFields>> {
    const result: Record<string, Required<DocumentVersionFields>> = {};
    for (const id of ids) {
      const cached = this.cache.get(id);
      if (cached) {
        result[id] = cached;
      }
    }
    return result;
  }

  async bulkGetVersions(ids: string[]): Promise<Record<string, Required<DocumentVersionFields>>> {
    if (ids.length === 0) {
      return {};
    }

    const result: Record<string, Required<DocumentVersionFields>> = {};
    const uncached: string[] = [];

    for (const id of ids) {
      const cached = this.cache.get(id);
      if (cached) {
        result[id] = cached;
      } else {
        uncached.push(id);
      }
    }

    if (uncached.length > 0) {
      const fresh = await this.bulkGetFreshVersions(uncached);
      Object.assign(result, fresh);
    }

    return result;
  }

  private async bulkGetFreshVersions(
    ids: string[]
  ): Promise<Record<string, Required<DocumentVersionFields>>> {
    if (ids.length === 0) {
      return {};
    }

    const { backingIndexes, writableIndex } = await this.deps.metadataManager.getMetaOrLoad();
    const realtimeIndexes = backingIndexes
      .slice(-REALTIME_BACKING_INDEX_WINDOW)
      .concat(this.deps.additionalIndexesToQuery ?? []);
    const indexes = realtimeIndexes.length > 0 ? realtimeIndexes : [writableIndex];
    const result: Record<string, Required<DocumentVersionFields>> = {};
    const found = new Set<string>();

    const mgetResponse = await this.deps.esClient.mget({
      docs: ids.flatMap((id) =>
        indexes.map((index) => ({ _index: index, _id: id, _source: false as const }))
      ),
    });

    for (const doc of mgetResponse.docs) {
      if (
        'found' in doc &&
        doc.found &&
        doc._id &&
        !found.has(doc._id) &&
        doc._seq_no !== undefined &&
        doc._primary_term !== undefined
      ) {
        const version: Required<DocumentVersionFields> = {
          index: doc._index,
          seqNo: doc._seq_no,
          primaryTerm: doc._primary_term,
        };
        found.add(doc._id);
        this.cache.set(doc._id, version);
        result[doc._id] = version;
      }
    }

    const missing = ids.filter((id) => !found.has(id));

    if (missing.length > 0) {
      const searchResponse = await this.deps.esClient.search({
        index: [this.deps.dataStreamName, ...(this.deps.additionalIndexesToQuery ?? [])],
        query: { ids: { values: missing } },
        size: missing.length,
        _source: false,
        seq_no_primary_term: true,
        ignore_unavailable: true,
      });

      for (const hit of searchResponse.hits.hits) {
        if (hit._id && hit._seq_no !== undefined && hit._primary_term !== undefined) {
          const version: Required<DocumentVersionFields> = {
            index: hit._index,
            seqNo: hit._seq_no,
            primaryTerm: hit._primary_term,
          };
          this.cache.set(hit._id, version);
          result[hit._id] = version;
        }
      }
    }

    return result;
  }
}
