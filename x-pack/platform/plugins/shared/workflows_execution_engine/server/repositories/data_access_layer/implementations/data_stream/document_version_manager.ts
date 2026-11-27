/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LRUCache } from 'lru-cache';
import type { ElasticsearchClient } from '@kbn/core/server';
import { REALTIME_BACKING_INDEX_WINDOW } from './constants';
import type { DataStreamMetadataManager } from './data_stream_metadata_manager';
import type { DocumentVersionFields } from '../../types';

const VERSION_CACHE_MAX = 32;
const VERSION_CACHE_TTL_MS = 60_000;

const searchCompleted = (response: {
  timed_out?: boolean;
  _shards?: { failed: number };
}): boolean => response.timed_out !== true && (response._shards?.failed ?? 0) === 0;

/** A missing optional legacy index is absence. Any other non-`found: false` read is not. */
const blocksConfirmedMiss = (
  doc: { _id?: string; _index?: string; found?: boolean; error?: { type?: string } },
  legacyIndexes: ReadonlySet<string>
): boolean => {
  if (!doc._id) {
    return false;
  }
  if (
    doc.error?.type === 'index_not_found_exception' &&
    doc._index !== undefined &&
    legacyIndexes.has(doc._index)
  ) {
    return false;
  }
  return !('found' in doc) || doc.found !== false;
};

export interface VersionLookup {
  versions: Record<string, Required<DocumentVersionFields>>;
  /** Ids every read reported as absent. An errored or partial read is not in this set. */
  confirmedMissing: ReadonlySet<string>;
}

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

  async bulkGetVersions(ids: string[]): Promise<VersionLookup> {
    if (ids.length === 0) {
      return { versions: {}, confirmedMissing: new Set() };
    }

    const versions: Record<string, Required<DocumentVersionFields>> = {};
    const uncached: string[] = [];

    for (const id of ids) {
      const cached = this.cache.get(id);
      if (cached) {
        versions[id] = cached;
      } else {
        uncached.push(id);
      }
    }

    if (uncached.length === 0) {
      return { versions, confirmedMissing: new Set() };
    }

    const fresh = await this.bulkGetFreshVersions(uncached);
    Object.assign(versions, fresh.versions);
    return { versions, confirmedMissing: fresh.confirmedMissing };
  }

  private async bulkGetFreshVersions(ids: string[]): Promise<VersionLookup> {
    const { backingIndexes } = await this.deps.metadataManager.getMetaOrLoad();
    const indexes = backingIndexes
      .slice(-REALTIME_BACKING_INDEX_WINDOW)
      .concat(this.deps.additionalIndexesToQuery ?? []);
    const versions: Record<string, Required<DocumentVersionFields>> = {};
    const found = new Set<string>();
    const legacyIndexes = new Set(this.deps.additionalIndexesToQuery ?? []);
    // Present until a read says otherwise. An error doc has no `found` field, so it drops out.
    const confirmedMissing = new Set(ids);

    const mgetResponse = await this.deps.esClient.mget({
      docs: ids.flatMap((id) =>
        indexes.map((index) => ({ _index: index, _id: id, _source: false as const }))
      ),
    });

    for (const doc of mgetResponse.docs) {
      if (doc._id && blocksConfirmedMiss(doc, legacyIndexes)) {
        confirmedMissing.delete(doc._id);
      }
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
        versions[doc._id] = version;
      }
    }

    const missing = ids.filter((id) => !found.has(id));
    if (missing.length === 0) {
      return { versions, confirmedMissing };
    }

    const searchResponse = await this.deps.esClient.search({
      index: [this.deps.dataStreamName, ...(this.deps.additionalIndexesToQuery ?? [])],
      query: { ids: { values: missing } },
      size: missing.length,
      _source: false,
      seq_no_primary_term: true,
      ignore_unavailable: true,
    });
    if (!searchCompleted(searchResponse)) {
      confirmedMissing.clear();
    }

    for (const hit of searchResponse.hits.hits) {
      if (hit._id && hit._seq_no !== undefined && hit._primary_term !== undefined) {
        const version: Required<DocumentVersionFields> = {
          index: hit._index,
          seqNo: hit._seq_no,
          primaryTerm: hit._primary_term,
        };
        confirmedMissing.delete(hit._id);
        this.cache.set(hit._id, version);
        versions[hit._id] = version;
      }
    }

    return { versions, confirmedMissing };
  }
}
