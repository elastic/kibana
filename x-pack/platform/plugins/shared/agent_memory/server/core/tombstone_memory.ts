/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNotFoundError } from '@kbn/es-errors';
import type { MemoryDocument, MemoryStorage } from '../storage/memory_storage';
import type { ResolvedIdentity } from './resolve_identity';

export interface TombstoneMemoryParams {
  /** The Agent Memory document ID to soft-delete. */
  id: string;
  space_id: string;
  identity: ResolvedIdentity;
}

export interface TombstoneMemoryResult {
  /** `deleted` when found and tombstoned, `not_found` otherwise. */
  result: 'deleted' | 'not_found';
}

/**
 * Soft-deletes a memory by setting `deleted: true` in place.
 *
 * The document is never hard-deleted, preserving the audit trail. Memories
 * excluded from recall results because `deleted === true` are still visible in
 * ES|QL for admin inspection and can be physically removed via Index Management.
 *
 * Validates authoritative space and user scope before applying the tombstone.
 */
export const tombstoneMemory = async ({
  storage,
  params,
  abortSignal,
}: {
  storage: MemoryStorage;
  params: TombstoneMemoryParams;
  abortSignal?: AbortSignal;
}): Promise<TombstoneMemoryResult> => {
  const { id, space_id, identity } = params;
  const client = storage.getClient();
  const now = new Date().toISOString();

  abortSignal?.throwIfAborted();

  // Fetch the doc to confirm ownership before mutating it.
  let existing: MemoryDocument | undefined;
  let seqNo: number | undefined;
  let primaryTerm: number | undefined;
  try {
    const hit = await client.get({ id, _source: true, seq_no_primary_term: true });
    if (!hit.found) {
      return { result: 'not_found' };
    }
    // The storage adapter returns the _source as the mapped document type.
    existing = hit._source as MemoryDocument;
    seqNo = hit._seq_no;
    primaryTerm = hit._primary_term;
  } catch (error) {
    if (isNotFoundError(error)) {
      return { result: 'not_found' };
    }
    throw error;
  }

  abortSignal?.throwIfAborted();

  if (!existing) {
    return { result: 'not_found' };
  }

  // Ownership gate: visibility scope + space must match. Provenance is creator metadata only.
  const scopeKind = existing.memory?.scope_kind;
  const scopeId = existing.memory?.scope_id;
  const docSpaceId = existing.space_id;

  const isPersonalOwner =
    scopeKind === 'user' && scopeId === identity.author && docSpaceId === space_id;
  const isSpaceCreator =
    scopeKind === 'space' &&
    docSpaceId === space_id &&
    existing.memory?.provenance?.author === identity.author;

  if (!isPersonalOwner && !isSpaceCreator) {
    // Treat as not-found to avoid leaking existence of foreign memories.
    return { result: 'not_found' };
  }

  const updated: MemoryDocument = {
    ...existing,
    '@timestamp': now,
    deleted: true,
  };

  // OCC guard: reject if a concurrent write landed between our get and
  // this index. Let the error propagate; the caller can surface it.
  await client.index({
    id,
    document: updated,
    ...(seqNo !== undefined && primaryTerm !== undefined
      ? { if_seq_no: seqNo, if_primary_term: primaryTerm }
      : {}),
  });

  return { result: 'deleted' };
};
