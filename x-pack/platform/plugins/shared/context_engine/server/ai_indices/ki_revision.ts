/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import type { KiLifecycleStatus } from '../../common/step_types/ki';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import {
  KiConflictError,
  KiNotFoundError,
  KiValidationError,
} from './errors';
import { REVISION_TIE_WINDOW, kiIdQuery, pickCurrentRevision } from './ki_get';

/** A writer as recorded under `governance.provenance`. */
export interface KiWriter {
  uri: string;
  metadata: Record<string, string | number>;
}

/** A stored KI document. */
export interface StoredKi {
  id?: string;
  governance?: {
    provenance?: { created_by?: KiWriter; updated_by?: KiWriter };
    lifecycle?: { status?: KiLifecycleStatus };
  };
  [key: string]: unknown;
}

/** The current revision of a KI. */
export interface KiRevision {
  index: string;
  documentId: string;
  seqNo?: number;
  primaryTerm?: number;
  source: StoredKi;
}

/** Fields stamped on every revision a step writes. */
export interface KiRevisionChanges {
  updated_at: string;
  governance: {
    provenance: { updated_by: KiWriter };
    lifecycle?: { status: KiLifecycleStatus };
  };
  [key: string]: unknown;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Merges like the update API's `doc`: objects merge, other values are replaced. */
export const mergeKiDoc = (
  source: Record<string, unknown>,
  changes: Record<string, unknown>
): Record<string, unknown> => {
  const merged = { ...source };
  for (const [key, value] of Object.entries(changes)) {
    const current = merged[key];
    merged[key] =
      isPlainObject(current) && isPlainObject(value) ? mergeKiDoc(current, value) : value;
  }
  return merged;
};

export const isKiDeleted = (source: StoredKi): boolean =>
  source.governance?.lifecycle?.status === 'deleted';

/** Appends a new revision of a KI to a data stream. */
export const appendKiRevision = async ({
  esClient,
  destValue,
  kiId,
  source,
  changes,
  refresh,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  destValue: string;
  kiId: string;
  source: StoredKi;
  changes: KiRevisionChanges;
  refresh: boolean;
  abortSignal?: AbortSignal;
}): Promise<void> => {
  await esClient.index(
    {
      index: destValue,
      document: {
        ...mergeKiDoc(source, changes),
        '@timestamp': changes.updated_at,
        id: source.id ?? kiId,
      },
      op_type: 'create',
      ...(refresh && { refresh: 'wait_for' as const }),
    },
    { signal: abortSignal }
  );
};

/** Finds the current revision of a KI. */
export const findKiRevision = async ({
  esClient,
  aiIndexId,
  dest,
  kiId,
  abortSignal,
  backingIndex,
  includeSource,
}: {
  esClient: ElasticsearchClient;
  aiIndexId: string;
  dest: AiIndexDest;
  kiId: string;
  abortSignal?: AbortSignal;
  backingIndex?: string;
  /** Fetches the full `_source` for an index-type dest instead of just `id`/`governance`. */
  includeSource?: boolean;
}): Promise<KiRevision | undefined> => {
  const isDataStream = dest.type === 'data_stream';
  const useBackingIndexFilter = !isDataStream && backingIndex !== undefined;
  const resolveNewestRevision = isDataStream || useBackingIndexFilter;
  const searchSize = resolveNewestRevision ? REVISION_TIE_WINDOW : 2;
  const response = await esClient.search<StoredKi>(
    {
      index: dest.value,
      ignore_unavailable: true,
      allow_no_indices: true,
      query: useBackingIndexFilter
        ? {
            bool: {
              filter: [kiIdQuery(kiId), { term: { _index: backingIndex } }],
            },
          }
        : kiIdQuery(kiId),
      ...(resolveNewestRevision && {
        sort: [{ '@timestamp': { order: 'desc' as const, unmapped_type: 'date' as const } }],
      }),
      size: searchSize,
      seq_no_primary_term: true,
      _source: isDataStream || includeSource ? true : ['id', 'governance'],
    },
    { signal: abortSignal }
  );

  const { hits } = response.hits;
  if (!resolveNewestRevision && hits.length > 1) {
    throw new KiValidationError(
      `KI '${kiId}' is ambiguous in AI index '${aiIndexId}': it exists in multiple backing indices`
    );
  }

  const hit = resolveNewestRevision ? pickCurrentRevision(hits) : hits[0];
  if (!hit?._index) {
    return undefined;
  }
  return {
    index: hit._index,
    documentId: hit._id ?? kiId,
    seqNo: hit._seq_no,
    primaryTerm: hit._primary_term,
    source: hit._source ?? {},
  };
};

/** Finds the current revision of a KI, failing when it does not exist. */
export const getKiRevision = async (
  options: Parameters<typeof findKiRevision>[0]
): Promise<KiRevision> => {
  const revision = await findKiRevision(options);
  if (!revision) {
    throw new KiNotFoundError(options.aiIndexId, options.kiId);
  }
  return revision;
};

/** Writes changes onto an already-resolved KI revision: appends a new revision for a
 * data stream, or partial-merges them in place (with optimistic concurrency) otherwise. */
export const writeKiRevision = async ({
  esClient,
  aiIndexId,
  dest,
  kiId,
  revision,
  changes,
  refresh = false,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  aiIndexId: string;
  dest: AiIndexDest;
  kiId: string;
  revision: KiRevision;
  changes: KiRevisionChanges;
  refresh?: boolean;
  abortSignal?: AbortSignal;
}): Promise<{ result: 'updated' | 'noop' }> => {
  if (dest.type === 'data_stream') {
    await appendKiRevision({
      esClient,
      destValue: dest.value,
      kiId,
      source: revision.source,
      changes,
      refresh,
      abortSignal,
    });
    return { result: 'updated' };
  }

  const response = await esClient
    .update(
      {
        index: revision.index,
        id: revision.documentId,
        doc: changes,
        if_seq_no: revision.seqNo,
        if_primary_term: revision.primaryTerm,
        ...(refresh && { refresh: 'wait_for' as const }),
      },
      { signal: abortSignal }
    )
    .catch((error) => {
      if (isResponseError(error) && error.statusCode === 404) {
        throw new KiNotFoundError(aiIndexId, kiId);
      }
      if (isResponseError(error) && error.statusCode === 409) {
        throw new KiConflictError(aiIndexId, kiId);
      }
      throw error;
    });

  return { result: response.result === 'noop' ? 'noop' : 'updated' };
};
