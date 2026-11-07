/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getKiRevision,
  putKiRevision,
  writeKiRevision,
  type KiRevision,
} from '@kbn/context-engine-plugin/server/ai_indices/ki_revision';
import type { MemoryRevision, MemoryStore, MemoryStoreScope } from './types';

// Revisions passed back to this store are always ones it returned from `get`.
const asKiRevision = (revision: MemoryRevision): KiRevision => revision as KiRevision;

/** Stores memories as KIs in the AI index's backing Elasticsearch index or data stream. */
export const createElasticsearchMemoryStore = ({
  aiIndexId,
  dest,
  esClient,
}: MemoryStoreScope): MemoryStore => ({
  get: (kiId) =>
    getKiRevision({
      esClient,
      aiIndexId,
      dest,
      kiId,
      abortSignal: new AbortController().signal,
      includeSource: true,
    }),

  put: async ({ kiId, document, existing }) => {
    const revision = existing ? asKiRevision(existing) : undefined;
    if (
      dest.type === 'index' &&
      revision &&
      (revision.seqNo === undefined || revision.primaryTerm === undefined)
    ) {
      throw new Error(`Memory '${kiId}' is missing concurrency metadata.`);
    }

    await putKiRevision({
      esClient,
      aiIndexId,
      dest,
      kiId,
      document,
      existing: dest.type === 'index' ? revision : undefined,
      failIfExists: !existing,
      refresh: true,
    });
  },

  markDeleted: async ({ kiId, existing, changes }) => {
    await writeKiRevision({
      esClient,
      aiIndexId,
      dest,
      kiId,
      revision: asKiRevision(existing),
      changes,
      refresh: true,
      abortSignal: new AbortController().signal,
    });
  },
});
